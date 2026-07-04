'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { createTag, deleteTag, fetchTags, updateTag, type Tag } from '@/lib/graphql';
import { Plus, Tag as TagIcon, Trash2, Pencil } from 'lucide-react';

const PRESET_COLORS = ['#58cc02', '#1899d6', '#ff4b4b', '#ff9600', '#ce82ff', '#2b70c9', '#4b4b4b'];

export default function EtiquetasPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tag | null>(null);

  const load = useCallback(() => {
    fetchTags()
      .then((d) => setTags(d.tags))
      .catch((e) => toast.error(e.message));
  }, []);
  useEffect(() => load(), [load]);

  async function remove(tag: Tag) {
    if (!confirm(`¿Eliminar la etiqueta "${tag.name}"?`)) return;
    try {
      await deleteTag(tag.id);
      toast.success('Etiqueta eliminada');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Etiquetas"
        description="Clasifica clientes y créditos con etiquetas de color (buen pagador, moroso, zona…). Créalas aquí y reutilízalas en toda la operación."
        actions={
          <TagDrawer
            open={open}
            setOpen={setOpen}
            editing={editing}
            onDone={() => {
              setEditing(null);
              load();
            }}
          />
        }
      />

      {tags.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Aún no hay etiquetas. Crea la primera.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tags.map((t) => (
            <Card key={t.id}>
              <CardContent className="flex items-center gap-3 p-4">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${t.color}22`, color: t.color }}>
                  <TagIcon className="h-4 w-4" />
                </span>
                <span className="flex-1 truncate font-medium">{t.name}</span>
                <button
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setEditing(t);
                    setOpen(true);
                  }}
                  aria-label="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button className="text-muted-foreground hover:text-destructive" onClick={() => remove(t)} aria-label="Eliminar">
                  <Trash2 className="h-4 w-4" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function TagDrawer({
  open,
  setOpen,
  editing,
  onDone,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  editing: Tag | null;
  onDone: () => void;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);

  // Sincroniza el formulario cuando se abre para editar o crear.
  useEffect(() => {
    if (open) {
      setName(editing?.name ?? '');
      setColor(editing?.color ?? PRESET_COLORS[0]);
    }
  }, [open, editing]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await updateTag({ id: editing.id, name, color });
        toast.success('Etiqueta actualizada');
      } else {
        await createTag({ name, color });
        toast.success('Etiqueta creada');
      }
      setOpen(false);
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Nueva etiqueta
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <TagIcon className="h-5 w-5" /> {editing ? 'Editar etiqueta' : 'Nueva etiqueta'}
          </SheetTitle>
        </SheetHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Buen pagador" required />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="h-8 w-8 rounded-full border-2 transition-transform"
                  style={{ backgroundColor: c, borderColor: color === c ? '#000' : 'transparent', transform: color === c ? 'scale(1.1)' : undefined }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border p-3">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}22`, color }}>
              <TagIcon className="h-4 w-4" />
            </span>
            <span className="font-medium">{name || 'Vista previa'}</span>
          </div>
          <Button type="submit" className="w-full" disabled={saving || !name.trim()}>
            {editing ? 'Guardar cambios' : 'Crear etiqueta'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
