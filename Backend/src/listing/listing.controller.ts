import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ListingService } from './listing.service';

import { listingSchema, ListingSchemaDTO } from './dto/create-listing.dto';
import { ZodValidationPipe } from 'common/validator/zod.validator';
import { UpdateListing, UpdateListingDTO } from './dto/update-listing.dto';
import { ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { CACHE_TTL } from 'common/config/cache.config';
import { Public } from 'common/decorator/public.decorator';

@Controller('listing')
export class ListingController {
  constructor(
    private readonly listingService: ListingService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Public()
  @Get()
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status (PUBLISH, DRAFT)' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category name' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number for pagination' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page' })
  @ApiQuery({ name: 'nocache', required: false, description: 'Bypass cache (true/false)' })
  async findAll(
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('userId') userId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('nocache') nocache?: string,
  ) {
    // Create cache key based on query parameters
    const cacheKey = `${this.constructor.name}:${status || 'all'}:${category || 'all'}:${userId || 'all'}:${page || '1'}:${limit || 'all'}`;
    
    // Check cache only if nocache is not set
    if (nocache !== 'true') {
      const value = await this.cacheManager.get(cacheKey);
      if (value) {
        return value;
      }
    }
    
    const filters = {
      status: status as 'PUBLISH' | 'DRAFT' | undefined,
      category,
      userId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    };
    
    const data = await this.listingService.findAll(filters);
    
    // Only cache if we got results (don't cache empty arrays for too long)
    if (Array.isArray(data) && data.length > 0) {
      await this.cacheManager.set(cacheKey, data, CACHE_TTL);
    }
    
    return data;
  }

  @Public()
  @Get(':id')
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Listing Id',
    required: true,
  })
  async findOne(@Param('id') id: string, @Query('nocache') nocache?: string) {
    // Check cache only if nocache is not set
    if (nocache !== 'true') {
      const value = await this.cacheManager.get(`${this.constructor.name}:${id}`);
      if (value) {
        return value;
      }
    } else {
      // Clear cache if nocache is true
      await this.cacheManager.del(`${this.constructor.name}:${id}`);
    }
    
    const data = await this.listingService.findOne(id);
    
    // Only cache if we got data
    if (data) {
      await this.cacheManager.set(
        `${this.constructor.name}:${id}`,
        data,
        CACHE_TTL,
      );
    }
    return data;
  }

  @Post()
  @ApiBody({ type: () => ListingSchemaDTO })
  async create(
    @Req() req: Request,
    @Body(new ZodValidationPipe(listingSchema)) body,
  ) {
    try {
      const user = (req as any).user;
      if (!user || !user.id) {
        throw new Error('User not authenticated');
      }

      this.listingService['db']?.user?.findUnique || null;
      
      // CRITICAL: Use the authenticated user's ID from the JWT token
      // This ensures listings are always created under the correct user
      const data = await this.listingService.create(user.id, body);
      await this.cacheManager.del(`${this.constructor.name}`);
      
      return data;
    } catch (error) {
      throw error;
    }
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Listing Id',
    required: true,
  })
  @ApiBody({ type: () => UpdateListingDTO })
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateListing)) body,
  ) {
    const { id: userId } = (req as any).user;
    const data = await this.listingService.update(id, userId, body);
    
    // Invalidate all listing caches - both the specific listing and all findAll queries
    await this.cacheManager.del(`${this.constructor.name}:${id}`);
    // Note: Cache manager doesn't support pattern deletion, so we clear the base key
    // This will force fresh fetches on next request
    await this.cacheManager.del(`${this.constructor.name}`);
    
    const listingData = data as any;
    
    return data;
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Listing Id',
    required: true,
  })
  async delete(@Param('id') id: string) {
    const data = await this.listingService.delete(id);
    await this.cacheManager.del(`${this.constructor.name}`);
    return data;
  }
}
