import {
  Controller,
  Get,
  Param,
  Patch,
  Body,
  Post,
  Delete,
  UseGuards,
  Inject,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { UserService } from './user.service';
import { ZodValidationPipe } from 'common/validator/zod.validator';
import {
  UserSchema,
  UserSchemaDTO,
  UserUpdateSchema,
  UserUpdateSchemaDTO,
} from './dto/user.dto';
import { Roles } from 'common/decorator/roles.decorator';
import { RolesGuard } from 'common/guard/role.guard';
import { ApiBody, ApiParam } from '@nestjs/swagger';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { CACHE_TTL } from 'common/config/cache.config';
import {
  AddUserSchema,
  AddUserSchemaDTO,
  UserAdminUpdateSchema,
  UserAdminUpdateSchemaDTO,
} from './dto/add-user.dto';
import { LogAction } from 'common/decorator/action.decorator';
import { logSchema } from 'common/validator/logSchema.validator';
@Roles(['ADMIN', 'MONITER', 'STAFF'])
@UseGuards(RolesGuard)
@Controller('user')
export class UserController {
  constructor(
    private userService: UserService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Get('/')
  async findAll() {
    const value = await this.cacheManager.get(`${this.constructor.name}`);
    if (value) {
      return value;
    }
    const data = await this.userService.findAll();
    await this.cacheManager.set(`${this.constructor.name}`, data, CACHE_TTL);
    return data;
  }


  @Roles(['ADMIN', 'MONITER', 'USER', 'STAFF'])
  @UseGuards(RolesGuard)
  @Get('/favourite')
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  async getAllFavourite(@Req() req: Request) {
    return await this.userService.getAllFavourite((req as any).user.id);
  }

  @Roles(['ADMIN', 'MONITER', 'USER', 'STAFF'])
  @UseGuards(RolesGuard)
  @Get('/favourite/add/:listingId')
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  async AddFavourite(
    @Req() req: Request,
    @Param('listingId') listingId: string,
  ) {
    return await this.userService.addToFavourite(
      (req as any).user.id,
      listingId,
    );
  }

  @Roles(['ADMIN', 'MONITER', 'USER', 'STAFF'])
  @UseGuards(RolesGuard)
  @Get('/favourite/remove/:listingId')
  @ApiParam({ name: 'listingId', description: 'Listing ID', type: String })
  async removeFavourite(
    @Req() req: Request,
    @Param('listingId') listingId: string,
  ) {
    return await this.userService.removeFromFavourite(
      (req as any).user.id,
      listingId,
    );
  }
  @Roles(['ADMIN', 'MONITER', 'USER', 'STAFF'])
  @UseGuards(RolesGuard)
  @Get(':id')
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  async findOne(@Param('id') id: string) {
    const value = await this.cacheManager.get(`${this.constructor.name}:${id}`);
    if (value) {
      return value;
    }
    const data = await this.userService.findOneByID(id);
    await this.cacheManager.set(
      `${this.constructor.name}:${id}`,
      data,
      CACHE_TTL,
    );
    return data;
  }
  @Post()
  @LogAction(logSchema('create', 'user'))
  @ApiBody({ type: () => UserSchemaDTO })
  async createUser(@Body(new ZodValidationPipe(UserSchema)) body) {
    const payload = await this.userService.createUser(body);
    await this.cacheManager.del(`${this.constructor.name}`);
    return payload;
  }

  @Post('create-by-admin')
  @LogAction(logSchema('create-by-admin', 'user'))
  @ApiBody({ type: () => AddUserSchemaDTO })
  async createUserByAdmin(@Body(new ZodValidationPipe(AddUserSchema)) body) {
    const payload = await this.userService.createUserByAdmin(body);
    return payload;
  }

  @Patch('update-by-admin/:id')
  @LogAction(logSchema('update-by-admin', 'user'))
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiBody({ type: () => UserAdminUpdateSchemaDTO })
  async updateUserByAdmin(
    @Req() req: Request,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UserAdminUpdateSchema)) body,
  ) {
    // Security: Only allow ADMIN role assignment by existing admins
    const currentUser = (req as any).user;
    const currentUserData = await this.userService.findOneByID(currentUser?.id);
    
    // If trying to change role to ADMIN, verify current user is ADMIN
    if (body.role === 'ADMIN') {
      if (!currentUserData || (currentUserData as any).role !== 'ADMIN') {
        throw new HttpException(
          'Only existing admins can assign ADMIN role',
          HttpStatus.FORBIDDEN,
        );
      }
    }
    
    // Prevent users from changing their own role to ADMIN (security measure)
    if (body.role === 'ADMIN' && currentUser?.id === id) {
      throw new HttpException(
        'Users cannot promote themselves to ADMIN',
        HttpStatus.FORBIDDEN,
      );
    }
    
    const payload = await this.userService.updateUser(id, body);
    await this.cacheManager.del(`${this.constructor.name}`);
    return payload;
  }

  @Roles(['ADMIN', 'MONITER', 'USER', 'STAFF'])
  @UseGuards(RolesGuard)
  @Patch(':id')
  @LogAction(logSchema('update', 'user'))
  @ApiBody({ type: () => UserUpdateSchemaDTO })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  async updateUser(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UserUpdateSchema)) body,
  ) {
    const payload = await this.userService.updateUser(id, body);
    await this.cacheManager.del(`${this.constructor.name}`);
    return payload;
  }

  

 

  @Delete(':id')
  @LogAction(logSchema('delete', 'user'))
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  async deleteUser(@Param('id') id: string) {
    const payload = await this.userService.deleteUser(id);
    await this.cacheManager.del(`${this.constructor.name}`);
    return payload;
  }
}
