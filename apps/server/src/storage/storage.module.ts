import { Global, Module } from '@nestjs/common';
import { FilesystemAdapter } from './filesystem.storage';
import { STORAGE_ADAPTER } from './storage.interface';

@Global()
@Module({
  providers: [
    { provide: STORAGE_ADAPTER, useClass: FilesystemAdapter },
    FilesystemAdapter,
  ],
  exports: [STORAGE_ADAPTER, FilesystemAdapter],
})
export class StorageModule {}
