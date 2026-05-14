import { Injectable } from "@nestjs/common";

export interface HealthCheckResponse {
    status: 'ok';
    service: 'leosgyr-api';
    timestamp: string;
}

@Injectable()
export class AppService {
    public getHealth(): HealthCheckResponse {
        return {
            status: 'ok',
            service: 'leosgyr-api',
            timestamp: new Date().toISOString(),
        };
    }
}