import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  // Get all users (protected route)
  @UseGuards(JwtAuthGuard)
  @Get()
  async getAll() {
    return this.usersService.getAll();
  }

  // Get a single user by ID (protected route)
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.usersService.findById(+id);
  }

  // Create a new user (open route for demo purposes)
  @Post()
  async create(@Body() body: { username: string; password: string }) {
    return this.usersService.createUser(body.username, body.password);
  }

  // Update an existing user by ID (protected route)
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.usersService.updateUser(+id, body);
  }

  // Delete a user by ID (protected route)
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.usersService.deleteUser(+id);
  }
}