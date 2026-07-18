import { Module, forwardRef } from '@nestjs/common';
import { PlanningController } from './planning.controller';
import { PlanningService } from './planning.service';
import { AsyncPlanEngine } from './async-plan.engine';
import { TripsModule } from '../trips/trips.module';

@Module({
  imports: [forwardRef(() => TripsModule)],
  controllers: [PlanningController],
  providers: [PlanningService, AsyncPlanEngine],
  exports: [PlanningService, AsyncPlanEngine],
})
export class PlanningModule {}
