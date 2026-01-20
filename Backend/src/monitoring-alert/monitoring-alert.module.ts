import { Module } from '@nestjs/common';
import { MonitoringAlertService } from './monitoring-alert.service';
import { MonitoringAlertController } from './monitoring-alert.controller';

@Module({
  controllers: [MonitoringAlertController],
  providers: [MonitoringAlertService],
  exports: [MonitoringAlertService],
})
export class MonitoringAlertModule {}
