import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  private instanceId: string | null = null;
  private availabilityZone: string | null = null;

  constructor(private readonly dataSource: DataSource) {
    this.detectAwsMetadata();
  }

  private async detectAwsMetadata() {
    try {
      const IMDS = 'http://169.254.169.254/latest/';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);

      const tokenRes = await fetch(IMDS + 'api/token', {
        method: 'PUT',
        headers: { 'X-aws-ec2-metadata-token-ttl-seconds': '60' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (tokenRes.ok) {
        const token = await tokenRes.text();
        const idRes = await fetch(IMDS + 'meta-data/instance-id', {
          headers: { 'X-aws-ec2-metadata-token': token },
        });
        const azRes = await fetch(IMDS + 'meta-data/placement/availability-zone', {
          headers: { 'X-aws-ec2-metadata-token': token },
        });

        if (idRes.ok) this.instanceId = (await idRes.text()).trim();
        if (azRes.ok) this.availabilityZone = (await azRes.text()).trim();
      }
    } catch {
      // Not on AWS EC2 (e.g. running locally or IMDS unavailable)
      this.instanceId = process.env.AWS_INSTANCE_ID || 'i-dev-local-01';
      this.availabilityZone = process.env.AWS_AZ || 'us-east-1a (simulateur)';
    }
  }

  @Public()
  @Get()
  async health() {
    return this.getHealthStatus();
  }

  @Public()
  @Get('cloud-info')
  async cloudInfo() {
    return {
      status: 'ok',
      service: 'HelpDesk Cloud NestJS Backend',
      instanceId: this.instanceId || 'i-dev-local-01',
      availabilityZone: this.availabilityZone || 'us-east-1a (simulateur)',
      region: process.env.AWS_REGION || 'us-east-1',
      database: {
        type: this.dataSource.options.type,
        isConnected: this.dataSource.isInitialized,
      },
      s3Storage: {
        bucket: process.env.S3_BUCKET_NAME || 'local-uploads-fallback',
        enabled: !!process.env.S3_BUCKET_NAME,
      },
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  private async getHealthStatus() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      instanceId: this.instanceId || 'i-dev-local-01',
      availabilityZone: this.availabilityZone || 'us-east-1a (simulateur)',
      database: this.dataSource.isInitialized ? 'connected' : 'disconnected',
    };
  }
}
