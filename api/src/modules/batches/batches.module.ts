import { Module } from '@nestjs/common';
import { BatchesController } from './batches.controller';
import { MyBatchesController } from './my-batches.controller';
import { BatchesService } from './batches.service';

@Module({
  controllers: [BatchesController, MyBatchesController],
  providers: [BatchesService],
})
export class BatchesModule {}
