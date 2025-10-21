import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { PositionsService } from './positions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('positions')
export class PositionsController {
  constructor(private positionsService: PositionsService) {}

  // Get all users (protected route)
  @UseGuards(JwtAuthGuard)
  @Get()
  async getAll() {
    return this.positionsService.getAll();
  }

  // Get a single user by ID (protected route)
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.positionsService.findById(+id);
  }

  // Create a new position (authenticated)
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Request() req: any, @Body() body: { position_code: string; position_name: string }) {
    if (!body || typeof body.position_code !== 'string' || typeof body.position_name !== 'string') {
      throw new BadRequestException('position_code and position_name are required');
    }

    // JwtStrategy.validate returns { userId, username, role }
    const user = req.user;
    if (!user || typeof user.userId !== 'number') {
      throw new BadRequestException('Authenticated user id not available');
    }

    return this.positionsService.createPositions(body.position_code, body.position_name, user.userId);
  }

  // Update an existing user by ID (protected route)
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.positionsService.updatepositions(+id, body);
  }

  // Delete a user by ID (protected route)
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.positionsService.deletePosition(+id);
  }
}