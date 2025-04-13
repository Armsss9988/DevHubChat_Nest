import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Get,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from './guards/auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      console.log('Trying to refresh');
      const { accessToken, refreshToken } =
        await this.authService.register(dto);
      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });
      res.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
        maxAge: 1000 * 60 * 15,
      });
      if (!accessToken) {
        res.status(403);
      }
      return res.status(201);
    } catch {
      res.status(403);
    }
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'User logged in with token' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.validateUser(dto.email, dto.password);

    try {
      console.log('Trying to refresh');
      const { accessToken, refreshToken } = await this.authService.login(user);
      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });
      res.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
        maxAge: 1000 * 60 * 15,
      });
      if (!accessToken) {
        res.status(403);
      }
      return res.status(201).json(user);
    } catch {
      res.status(403);
    }
  }
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get current user' })
  @ApiResponse({ status: 200, description: 'Current user data' })
  getMe(@Req() req: Request) {
    console.log('user', req.user);
    return req.user;
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      console.log('Trying to refresh');
      const { accessToken, refreshToken } =
        await this.authService.refreshToken(req);
      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });
      res.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
        maxAge: 1000 * 60 * 15,
      });
      if (!accessToken) {
        res.status(403);
      }
      return res.status(201);
    } catch {
      res.status(403);
    }
  }
}
