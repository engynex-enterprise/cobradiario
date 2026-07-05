import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

export interface UploadedFile {
  url: string;
  key: string;
}

// Import dinámico real (el SDK de InsForge es ESM y el backend es CommonJS).
// El truco con Function evita que TypeScript lo transpile a require().
const dynamicImport = new Function('m', 'return import(m)') as (m: string) => Promise<{ createClient: (o: { baseUrl: string; anonKey: string }) => InsforgeClient }>;

interface InsforgeClient {
  storage: { from(bucket: string): { upload(key: string, file: unknown): Promise<{ data: UploadedFile | null; error: unknown }> } };
}

/**
 * Almacenamiento de archivos vía InsForge (bucket público, subida server-side
 * con la API key admin). Interfaz mínima para poder migrar a otro proveedor
 * (p. ej. GCP Cloud Storage) cambiando solo esta implementación.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly bucket = process.env.INSFORGE_BUCKET ?? 'client-kyc';
  private clientPromise?: Promise<InsforgeClient>;

  private getClient(): Promise<InsforgeClient> {
    if (!this.clientPromise) {
      this.clientPromise = dynamicImport('@insforge/sdk').then(({ createClient }) =>
        createClient({
          baseUrl: process.env.INSFORGE_URL ?? '',
          anonKey: process.env.INSFORGE_API_KEY ?? '',
        }),
      );
    }
    return this.clientPromise;
  }

  /** Sube una imagen recibida como data URL base64 y devuelve su URL pública + key. */
  async uploadDataUrl(dataUrl: string, folder = 'misc'): Promise<UploadedFile> {
    const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl.trim());
    if (!match) throw new BadRequestException('Imagen inválida: se espera un data URL base64.');
    const [, mime, b64] = match;
    const buffer = Buffer.from(b64, 'base64');
    if (buffer.length > 12 * 1024 * 1024) throw new BadRequestException('La imagen supera el tamaño permitido.');

    const ext = (mime.split('/')[1] ?? 'bin').split('+')[0];
    const key = `${folder}/${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
    const file = new Blob([buffer], { type: mime });

    const client = await this.getClient();
    const { data, error } = await client.storage.from(this.bucket).upload(key, file);
    if (error || !data) {
      this.logger.error(`InsForge upload error: ${JSON.stringify(error)}`);
      throw new BadRequestException('No se pudo subir la imagen.');
    }
    return { url: data.url, key: data.key };
  }
}
