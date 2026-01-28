import {
    Controller,
    Post,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportService } from './import.service';
import { TenantGuard } from '../common/guards/tenant.guard';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../shared/enums';
import { TenantContext } from '../shared/tenant-context';

interface UploadedFileType {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
}

@Controller('api/import')
export class ImportController {
    private readonly logger = new Logger(ImportController.name);

    constructor(private readonly importService: ImportService) {
        this.logger.log('ImportController initialized');
    }

    @Post('ping')
    async ping() {
        this.logger.log('Ping endpoint hit');
        return { message: 'Pong!', timestamp: new Date().toISOString() };
    }

    @Post('excel-test')
    @UseInterceptors(FileInterceptor('file'))
    async uploadExcelTest(@UploadedFile() file: UploadedFileType) {
        this.logger.log(`TEST endpoint hit - file: ${file ? 'present' : 'missing'}`);
        if (file) {
            this.logger.log(`File details: ${file.originalname}, ${file.size} bytes`);
        }
        return { message: 'Test endpoint reached', filePresent: !!file, fileName: file?.originalname, fileSize: file?.size };
    }

    @Post('test')
    @UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
    @Roles(Role.OWNER, Role.ADMIN)
    async testEndpoint() {
        this.logger.log('Test endpoint hit');
        return { message: 'Test successful', timestamp: new Date().toISOString() };
    }

    @Post('excel')
    @UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
    @Roles(Role.OWNER, Role.ADMIN)
    @UseInterceptors(
        FileInterceptor('file', {
            limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
            fileFilter: (req, file, cb) => {
                console.log('FileInterceptor fileFilter called:', file.originalname, file.mimetype);
                if (!file.originalname.match(/\.(xlsx|xls)$/i)) {
                    console.log('FileInterceptor: Rejecting non-Excel file');
                    return cb(new BadRequestException('Only Excel files (.xlsx, .xls) are allowed'), false);
                }
                console.log('FileInterceptor: File accepted');
                cb(null, true);
            },
        }),
    )
    async uploadExcel(@UploadedFile() file: UploadedFileType) {
        this.logger.log(`Upload endpoint hit - file: ${file ? 'present' : 'missing'}`);

        const tenantId = TenantContext.getTenantId();
        this.logger.log(`Tenant ID from context: ${tenantId}`);

        if (!tenantId) {
            throw new BadRequestException('Tenant context missing');
        }
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        this.logger.log(`File details: name=${file.originalname}, size=${file.size}, bufferLength=${file.buffer?.length || 0}, mimetype=${file.mimetype}`);

        if (!file.buffer || file.buffer.length === 0) {
            throw new BadRequestException('File buffer is empty. The file may not have been uploaded correctly.');
        }

        this.logger.log(`Importing Excel file: ${file.originalname} (${file.size} bytes) for tenant: ${tenantId}`);

        try {
            const result = await this.importService.importExcel(file, tenantId);
            this.logger.log(`Import completed: ${JSON.stringify(result)}`);
            return result;
        } catch (error: any) {
            this.logger.error(`Import failed: ${error.message}`, error.stack);
            throw new BadRequestException(`Import failed: ${error.message}`);
        }
    }
}
