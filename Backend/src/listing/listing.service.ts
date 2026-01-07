import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateListingT } from './dto/update-listing.dto';
import { Brand, ListingSchemaT } from './dto/create-listing.dto';

@Injectable()
export class ListingService {
  constructor(private readonly db: PrismaService) {}

  async findAll(filters?: {
    status?: 'PUBLISH' | 'DRAFT';
    category?: string;
    page?: number;
    limit?: number;
  }) {
    // Build where clause for filtering
    const where: any = {};
    
    // Filter by status if provided
    if (filters?.status) {
      where.status = filters.status;
    }
    
    // Filter by category if provided
    if (filters?.category) {
      where.category = {
        some: {
          name: filters.category,
        },
      };
    }
    
    // Calculate pagination
    const page = filters?.page || 1;
    const limit = filters?.limit || 100; // Default limit
    const skip = (page - 1) * limit;
    
    return this.db.listing.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            created_at: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
        brand: true,
        category: true,
        tools: true,
        financials: true,
        statistics: true,
        productQuestion: true,
        managementQuestion: true,
        social_account: true,
        advertisement: true,
        handover: true,
      },
      skip: skip > 0 ? skip : undefined,
      take: limit,
      orderBy: {
        created_at: 'desc', // Order by newest first
      },
    });
  }

  async findOne(id: string) {
    return this.db.listing.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            created_at: true,
            first_name: true,
            last_name: true,
            email: true,
            profile_pic: true,
          },
        },
        brand: true,
        category: true,
        tools: true,
        financials: true,
        statistics: true,
        productQuestion: true,
        managementQuestion: true,
        social_account: true,
        advertisement: true,
        handover: true,
      },
    });
  }

  async create(userId: string, body: ListingSchemaT) {
    // return this.db.listing.create({
    //   data: {
    //     brand: {
    //       connect: {
    //         id: body.brand?.id as string,
    //       },
    //       create: body.brand,
    //     },
    //     category: {
    //       createMany: {
    //         data: body.category,
    //       },
    //     },
    //     tools: {
    //       createMany: {
    //         data: body.tool,
    //       },
    //     },
    //     status: body.status,
    //     user: {
    //       connect: { id: userId },
    //     },

    //     financials: {
    //       createMany: {
    //         data: body.financial,
    //       },
    //     },
    //     statistics: {
    //      create: {
    //           ...body.statistics,
    //           adverstising_channel: {createMany: {data:body.statistics?.adverstising_channel}},
    //           sales_channel:{ createMany: {data: body.statistics?.sales_channel}},
    //           sales_countries:{ createMany:
    //             {data: body.statistics?.sales_countries}}
    //         },
    //       },
    //     },
    //     productQuestion: { createMany: { data: body.product_question}},

    //     social_account: body
    //       ,
    //     advertisement:  body.advertisement ,
    //     handover: body.handover
    //   },
    // });
    // Filter out empty arrays and ensure all arrays have valid data
    const filterValidArray = (arr: any[]): any[] => {
      if (!arr || !Array.isArray(arr)) return [];
      return arr.filter(item => {
        // Filter out null/undefined
        if (item === null || item === undefined) return false;
        
        // For Question objects, ensure they have required fields
        if (item.answer_for) {
          // Must have answer (at least 2 characters) or question text
          const hasAnswer = item.answer && String(item.answer).trim().length >= 2;
          const hasQuestion = item.question && String(item.question).trim().length >= 2;
          return hasAnswer || hasQuestion;
        }
        
        // For Category objects, ensure they have name
        if (item.name !== undefined) {
          return item.name && String(item.name).trim().length >= 2;
        }
        
        // For Tool objects, ensure they have name
        if (item.name !== undefined && !item.type) {
          return item.name && String(item.name).trim().length >= 2;
        }
        
        // For Financial objects, ensure they have required fields
        if (item.type === 'monthly' || item.type === 'yearly') {
          return item.name && item.revenue_amount && item.annual_cost;
        }
        
        // Default: keep the item if it's a valid object
        return typeof item === 'object' && Object.keys(item).length > 0;
      });
    };

    // Build data object, only including fields with valid non-empty arrays
    const createData: any = {
      portfolioLink: body.portfolioLink ? body.portfolioLink : undefined,
      status: body.status,
      user: {
        connect: { id: userId },
      },
    };

    // Only add createMany for arrays that have valid data
    const validBrand = filterValidArray(body.brand);
    if (validBrand.length > 0) {
      createData.brand = {
        createMany: {
          data: validBrand,
        },
      };
    } else if (body.brand && body.brand.length > 0) {
      console.warn('⚠️ Brand array provided but all items filtered out as invalid');
    }

    const validCategory = filterValidArray(body.category);
    if (validCategory.length > 0) {
      createData.category = {
        createMany: {
          data: validCategory,
        },
      };
    }

    const validTools = filterValidArray(body.tools);
    if (validTools.length > 0) {
      createData.tools = {
        createMany: {
          data: validTools,
        },
      };
    }

    const validFinancials = filterValidArray(body.financials);
    if (validFinancials.length > 0) {
      createData.financials = {
        createMany: {
          data: validFinancials,
        },
      };
    }

    const validStatistics = filterValidArray(body.statistics);
    if (validStatistics.length > 0) {
      createData.statistics = {
        createMany: {
          data: validStatistics,
        },
      };
    }

    const validProductQuestion = filterValidArray(body.productQuestion);
    if (validProductQuestion.length > 0) {
      createData.productQuestion = {
        createMany: {
          data: validProductQuestion,
        },
      };
    }

    const validManagementQuestion = filterValidArray(body.managementQuestion);
    if (validManagementQuestion.length > 0) {
      createData.managementQuestion = {
        createMany: {
          data: validManagementQuestion,
        },
      };
    }

    const validSocialAccount = filterValidArray(body.social_account);
    if (validSocialAccount.length > 0) {
      createData.social_account = {
        createMany: {
          data: validSocialAccount,
        },
      };
    }

    const validAdvertisement = filterValidArray(body.advertisement);
    if (validAdvertisement.length > 0) {
      createData.advertisement = {
        createMany: {
          data: validAdvertisement,
        },
      };
    }

    const validHandover = filterValidArray(body.handover);
    if (validHandover.length > 0) {
      createData.handover = {
        createMany: {
          data: validHandover,
        },
      };
    }

    // Final validation: ensure at least one data field exists (besides status and user)
    const dataFields = Object.keys(createData).filter(key => 
      key !== 'status' && key !== 'user' && key !== 'portfolioLink'
    );
    
    if (dataFields.length === 0) {
      console.error('❌ Cannot create listing: No valid data fields provided');
      throw new Error('Cannot create listing: At least one field (category, brand, tools, financials, etc.) must have valid data');
    }

    console.log('✅ Creating listing with data fields:', dataFields);
    console.log('📋 Full createData:', JSON.stringify(createData, null, 2));

    return this.db.listing.create({
      data: createData,
      //   For Testing Include these
      include: {
        brand: true,
        category: true,
        tools: true,
        financials: true,
        statistics: true,
        productQuestion: true,
        managementQuestion: true,
        social_account: true,
        advertisement: true,
        handover: true,
      },
    });
  }

  async update(id: string, userId: string, body: UpdateListingT) {
    // SPECIAL CASE: If only managed_by_ex is being updated, use a simpler update
    // Filter out undefined values to get only the fields being updated
    const updateKeys = Object.keys(body).filter(key => {
      const value = body[key as keyof UpdateListingT];
      return value !== undefined && value !== null;
    });
    
    console.log('🔍 Update request details:', {
      id,
      userId,
      updateKeys,
      bodyKeys: Object.keys(body),
      isOnlyManagedByExUpdate: updateKeys.length === 1 && updateKeys[0] === 'managed_by_ex'
    });
    
    const isOnlyManagedByExUpdate = updateKeys.length === 1 && updateKeys[0] === 'managed_by_ex';
    
    if (isOnlyManagedByExUpdate) {
      console.log(`📝 Updating only managed_by_ex for listing ${id}: ${body.managed_by_ex}`);
      
      // CRITICAL: Use updateMany directly - it bypasses Prisma's strict typing
      // and doesn't require the user connection
      try {
        const updateResult = await this.db.listing.updateMany({
          where: { id },
          data: {
            managed_by_ex: Boolean(body.managed_by_ex),
          } as any,
        });
        
        console.log(`✅ updateMany result: ${updateResult.count} listing(s) updated`);
        
        // Fetch the updated listing with all relations
        const updated = await this.db.listing.findUnique({ 
          where: { id },
          include: {
            brand: true,
            category: true,
            tools: true,
            financials: true,
            statistics: true,
            productQuestion: true,
            managementQuestion: true,
            social_account: true,
            advertisement: true,
            handover: true,
          },
        });
        
        if (!updated) {
          throw new Error(`Listing ${id} not found after update`);
        }
        
        console.log(`✅ Listing ${id} managed_by_ex updated successfully: ${(updated as any)?.managed_by_ex}`);
        return updated;
      } catch (error: any) {
        console.error('❌ Error updating managed_by_ex with updateMany:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          meta: error.meta
        });
        
        // Fallback: Use Prisma's $executeRaw for direct MongoDB update
        console.log('⚠️ Using raw MongoDB update as fallback');
        try {
          // For MongoDB, we need to use the collection name and ObjectId
          // Prisma with MongoDB uses the model name as collection name
          const boolValue = Boolean(body.managed_by_ex);
          
          // Use Prisma's executeRawUnsafe for MongoDB
          await (this.db as any).$executeRawUnsafe(
            JSON.stringify({
              update: 'Listing',
              updates: [{
                q: { _id: id },
                u: { $set: { managed_by_ex: boolValue } },
                upsert: false
              }]
            })
          );
          
          // Fetch the updated listing
          const updated = await this.db.listing.findUnique({ 
            where: { id },
            include: {
              brand: true,
              category: true,
              tools: true,
              financials: true,
              statistics: true,
              productQuestion: true,
              managementQuestion: true,
              social_account: true,
              advertisement: true,
              handover: true,
            },
          });
          
          if (!updated) {
            throw new Error(`Listing ${id} not found after raw update`);
          }
          
          console.log(`✅ Listing ${id} managed_by_ex updated via raw query: ${(updated as any)?.managed_by_ex}`);
          return updated;
        } catch (rawError: any) {
          console.error('❌ Raw MongoDB update also failed:', rawError);
          throw new Error(`Failed to update managed_by_ex. Prisma client may be out of sync. Please run: npx prisma generate. Error: ${rawError.message}`);
        }
      }
    }
    
    // Build update data object - start with basic fields
    const updateData: any = {};
    
    // Always include user connection
    updateData.user = {
      connect: { id: userId },
    };
    
    // Always include status if provided
    if (body.status) {
      updateData.status = body.status;
    }
    
    // CRITICAL: Always include managed_by_ex if provided (even if false)
    // This must be a direct field update, not nested
    if (body.managed_by_ex !== undefined) {
      updateData.managed_by_ex = Boolean(body.managed_by_ex);
      console.log(`📝 Updating listing ${id}: managed_by_ex = ${updateData.managed_by_ex}`);
    }
    
    // Include all the nested updates
    if (body.brand) {
      updateData.brand = {
        updateMany: body.brand.map((question) => ({
          where: { id: question.id },
          data: {
            answer: question.answer,
            question: question.question,
            answer_for: question.answer_for,
            answer_type: question.answer_type,
            option: question.option,
          },
        })),
      };
    }
    
    if (body.category) {
      updateData.category = {
        updateMany: body.category?.map((category) => ({
          where: { id: category.id },
          data: { name: category.name },
        })),
      };
    }
    
    if (body.tools) {
      updateData.tools = {
        updateMany: body.tools?.map((tool) => ({
          where: { id: tool.id },
          data: { name: tool.name },
        })),
      };
    }
    
    if (body.financials) {
      updateData.financials = {
        updateMany: body.financials?.map((financial) => ({
          where: { id: financial.id },
          data: {
            annual_cost: financial.annual_cost,
            revenue_amount: financial.revenue_amount,
            type: financial.type,
            name: financial.name,
            net_profit: financial.net_profit,
          },
        })),
      };
    }
    
    if (body.statistics) {
      updateData.statistics = {
        updateMany: body.statistics.map((question) => ({
          where: { id: question.id },
          data: {
            answer: question.answer,
            question: question.question,
            answer_for: question.answer_for,
            answer_type: question.answer_type,
            option: question.option,
          },
        })),
      };
    }
    
    if (body.productQuestion) {
      updateData.productQuestion = {
        updateMany: body.productQuestion.map((question) => ({
          where: { id: question.id },
          data: {
            answer: question.answer,
            question: question.question,
            answer_for: question.answer_for,
            answer_type: question.answer_type,
            option: question.option,
          },
        })),
      };
    }
    
    if (body.managementQuestion) {
      updateData.managementQuestion = {
        updateMany: body.managementQuestion.map((question) => ({
          where: { id: question.id },
          data: {
            answer: question.answer,
            question: question.question,
            answer_for: question.answer_for,
            answer_type: question.answer_type,
            option: question.option,
          },
        })),
      };
    }
    
    if (body.social_account) {
      updateData.social_account = {
        updateMany: body.social_account.map((question) => ({
          where: { id: question.id },
          data: {
            answer: question.answer,
            question: question.question,
            answer_for: question.answer_for,
            answer_type: question.answer_type,
            option: question.option,
          },
        })),
      };
    }
    
    if (body.advertisement) {
      updateData.advertisement = {
        updateMany: body.advertisement.map((question) => ({
          where: { id: question.id },
          data: {
            answer: question.answer,
            question: question.question,
            answer_for: question.answer_for,
            answer_type: question.answer_type,
            option: question.option,
          },
        })),
      };
    }
    
    if (body.handover) {
      updateData.handover = {
        updateMany: body.handover.map((question) => ({
          where: { id: question.id },
          data: {
            answer: question.answer,
            question: question.question,
            answer_for: question.answer_for,
            answer_type: question.answer_type,
            option: question.option,
          },
        })),
      };
    }
    
    // Log the update data for debugging
    console.log('📝 Update data for listing:', {
      id,
      updateDataKeys: Object.keys(updateData),
      hasManagedByEx: 'managed_by_ex' in updateData,
      managedByExValue: updateData.managed_by_ex
    });

    try {
      const result = await this.db.listing.update({
        where: { id },
        data: updateData,
        include: {
          brand: body.brand ? true : false,
          category: body.category ? true : false,
          tools: body.tools ? true : false,
          financials: body.financials ? true : false,
          statistics: body.statistics ? true : false,
          productQuestion: body.productQuestion ? true : false,
          managementQuestion: body.managementQuestion ? true : false,
          social_account: body.social_account ? true : false,
          advertisement: body.advertisement ? true : false,
          handover: body.handover ? true : false,
        },
      });
      
      const managedByEx = (result as any).managed_by_ex;
      console.log(`✅ Listing ${id} updated successfully. managed_by_ex = ${managedByEx}`);
      return result;
    } catch (error: any) {
      console.error('❌ Error updating listing:', error);
      console.error('Update data that caused error:', JSON.stringify(updateData, null, 2));
      throw error;
    }
  }

  async delete(id: string) {
    return this.db.listing.delete({
      where: { id },
      include: {
        brand: { where: { brandQuestionId: id } },
        category: { where: { listingId: id } },
        tools: { where: { listingId: id } },
        financials: { where: { listingId: id } },
        statistics: { where: { statisticsId: id } },
        productQuestion: { where: { productQuestionId: id } },
        managementQuestion: { where: { managementQuestionId: id } },
        Favourite: { where: { listingId: id } },
        social_account: { where: { social_accountId: id } },
        advertisement: { where: { advertisementId: id } },
        handover: { where: { handoverQuestionId: id } },
      },
    });
  }
}
