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
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
export class ImportController {
    private readonly logger = new Logger(ImportController.name);

    constructor(private readonly importService: ImportService) { }

    @Post('excel')
    @Roles(Role.OWNER, Role.ADMIN)
    @UseInterceptors(
        FileInterceptor('file', {
            limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
            fileFilter: (req, file, cb) => {
                if (!file.originalname.match(/\.(xlsx|xls)$/i)) {
                    return cb(new BadRequestException('Only Excel files (.xlsx, .xls) are allowed'), false);
                }
                cb(null, true);
            },
        }),
    )
    async uploadExcel(@UploadedFile() file: UploadedFileType) {
        const tenantId = TenantContext.getTenantId();
        if (!tenantId) {
            throw new BadRequestException('Tenant context missing');
        }
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        this.logger.log(`Importing Excel file: ${file.originalname} for tenant: ${tenantId}`);

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
