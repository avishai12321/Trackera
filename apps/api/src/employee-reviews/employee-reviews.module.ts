import { Module } from '@nestjs/common';
import { EmployeeReviewsController } from './employee-reviews.controller';
import { EmployeeReviewsService } from './employee-reviews.service';
import { SharedModule } from '../shared/shared.module';

@Module({
    imports: [SharedModule],
    controllers: [EmployeeReviewsController],
    providers: [EmployeeReviewsService],
    exports: [EmployeeReviewsService]
})
export class EmployeeReviewsModule { }
