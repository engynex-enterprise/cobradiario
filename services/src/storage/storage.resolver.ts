import { Args, Field, Mutation, ObjectType, Resolver } from '@nestjs/graphql';
import { UserRole } from '@prisma/client';
import { StorageService } from './storage.service';
import { Roles } from '../common/decorators';

@ObjectType('UploadResult')
export class UploadResultModel {
  @Field() url!: string;
  @Field() key!: string;
}

@Resolver()
export class StorageResolver {
  constructor(private readonly storage: StorageService) {}

  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.COLLECTOR)
  @Mutation(() => UploadResultModel, { name: 'uploadImage' })
  uploadImage(
    @Args('dataUrl') dataUrl: string,
    @Args('folder', { nullable: true }) folder?: string,
  ): Promise<UploadResultModel> {
    return this.storage.uploadDataUrl(dataUrl, folder ?? 'misc');
  }
}
