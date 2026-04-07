import {
  Controller,
  Post,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService } from './ai.service';
import type { AuthenticatedRequest } from '../auth/authenticated-request.interface';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('recommend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Recomendaciones personalizadas basadas en la biblioteca del usuario',
  })
  recommend(@Request() req: AuthenticatedRequest) {
    return this.aiService.getRecommendations(req.user.id);
  }
}
