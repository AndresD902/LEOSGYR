import { Controller, Get, Inject } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { AppService, type HealthCheckResponse  } from "./app.service";

@ApiTags('Health')
@Controller('health')
export class AppController {
    public constructor(@Inject(AppService) private readonly appService: AppService) {}

    @Get()
    @ApiOkResponse({
        description: 'Health check status.',
    })
    public getHealth(): HealthCheckResponse {
        return this.appService.getHealth();
    }
}