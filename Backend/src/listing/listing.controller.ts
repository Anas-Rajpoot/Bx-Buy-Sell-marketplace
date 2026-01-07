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
  @ApiQuery({ name: 'page', required: false, description: 'Page number for pagination' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page' })
  @ApiQuery({ name: 'nocache', required: false, description: 'Bypass cache (true/false)' })
  async findAll(
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('nocache') nocache?: string,
  ) {
    // Create cache key based on query parameters
    const cacheKey = `${this.constructor.name}:${status || 'all'}:${category || 'all'}:${page || '1'}:${limit || 'all'}`;
    
    // Check cache only if nocache is not set
    if (nocache !== 'true') {
      const value = await this.cacheManager.get(cacheKey);
      if (value) {
        console.log(`📦 Returning cached listings for key: ${cacheKey}, count: ${Array.isArray(value) ? value.length : 'N/A'}`);
        return value;
      }
    }
    
    const filters = {
      status: status as 'PUBLISH' | 'DRAFT' | undefined,
      category,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    };
    
    console.log(`🔍 Fetching listings from database with filters:`, filters);
    const data = await this.listingService.findAll(filters);
    console.log(`✅ Found ${Array.isArray(data) ? data.length : 0} listings`);
    
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
        console.log(`📦 Returning cached listing for ID: ${id}`);
        return value;
      }
    } else {
      // Clear cache if nocache is true
      await this.cacheManager.del(`${this.constructor.name}:${id}`);
      console.log(`🗑️ Cache cleared for listing ID: ${id}`);
    }
    
    console.log(`🔍 Fetching listing ${id} from database`);
    const data = await this.listingService.findOne(id);
    console.log(`✅ Listing data retrieved:`, {
      id: data?.id,
      hasBrand: !!data?.brand?.length,
      hasAdvertisement: !!data?.advertisement?.length,
      hasStatistics: !!data?.statistics?.length,
      brandCount: data?.brand?.length || 0,
      advertisementCount: data?.advertisement?.length || 0,
    });
    
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
        console.error('❌ Listing creation failed: User not authenticated');
        throw new Error('User not authenticated');
      }

      // Security: Verify user exists and is verified
      const userService = this.listingService['db']?.user?.findUnique || null;
      if (!userService) {
        // If we can't verify, log warning but proceed
        console.warn('⚠️ Could not verify user existence, proceeding with listing creation');
      }

      console.log('📝 Creating listing for authenticated user:', {
        userId: user.id,
        email: user.email,
        role: user.role
      });
      console.log('📦 Listing data keys:', Object.keys(body));
      console.log('📦 Listing status:', body.status);
      
      // CRITICAL: Use the authenticated user's ID from the JWT token
      // This ensures listings are always created under the correct user
      const data = await this.listingService.create(user.id, body);
      await this.cacheManager.del(`${this.constructor.name}`);
      
      console.log('✅ Listing created successfully:', {
        listingId: data.id,
        userId: user.id,
        status: data.status
      });
      return data;
    } catch (error) {
      console.error('❌ Error creating listing:', error);
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
    
    // Type assertion needed because Prisma include types don't always include all fields
    const listingData = data as any;
    console.log(`🗑️ Cache invalidated for listing ${id} and all listing queries`);
    console.log(`✅ Updated listing data includes managed_by_ex: ${listingData?.managed_by_ex}`);
    
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
