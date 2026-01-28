import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ImportService } from './import.service';
import { ImportController } from './import.controller';
import { SharedModule } from '../shared/shared.module';
import { memoryStorage } from 'multer';

@Module({
    imports: [
        SharedModule,
        MulterModule.register({
            storage: memoryStorage(), // Store files in memory as buffers
            limits: {
                fileSize: 10 * 1024 * 1024, // 10MB limit
            },
        }),
    ],
    controllers: [ImportController],
    providers: [ImportService],
})
export class ImportModule { }
