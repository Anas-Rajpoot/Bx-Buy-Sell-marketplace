import { HttpException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import type { UpdateUserType, UserType } from './dto/user.dto';
import type {
  UpdateAdminUserType,
  UserAdminUpdateSchema,
} from './dto/add-user.dto';
@Injectable()
export class UserService {
  constructor(private db: PrismaService) {}
  async findAll() {
    return await this.db.user.findMany({
      omit: {
        password_hash: true,
      },
    });
  }

  async findOneByEmail(email: string) {
    return this.db.user.findFirst({ where: { email: email } });
  }

  async findOneByID(id: string) {
    return this.db.user.findUnique({
      where: { id: id },
      omit: {
        password_hash: true,
      },
    });
  }

  async createUser(body) {
    return await this.db.user.create({ data: body });
  }
  async createUserByAdmin(body) {
    let payload = { ...body };
    payload.password_hash = body.password;
    payload.verified = body.active;
    delete payload.password;
    delete payload.confirm_password;
    delete payload.active;
    console.log(payload);
    return await this.db.user.create({ data: payload });
  }

  async getAllFavourite(id: string) {
    console.log(id)
    return await this.db.favourite.findMany({
      where: {
        userId: `${id}`,
      },
      include:{
        listing:{
          include:{
            brand:true,
            advertisement:true,
            category:true,
            financials:true,
            handover:true,
            managementQuestion:true,
            productQuestion:true,
            social_account:true,
            statistics:true,
            tools:true,
            user:true
          }
        }
      }
    });
  }

  async addToFavourite(id: string, listingId: string) {
    return this.db.favourite.create({
      data: {
        userId: `${id}`,
        listingId: `${listingId}`,
      },
    });
  }

  async removeFromFavourite(userId: string, listingId: string) {
    const favourite = await this.db.favourite.findFirst({
      where: {
        userId: `${userId}`,
        listingId: `${listingId}`,
      },
    });

    if(!favourite)
    {
      throw new HttpException("Favourite not found", 404)
    }
    return this.db.favourite.delete({
      where: {
       id: favourite.id,
      },
    });
  }


  async updateUser(id: string, body: UpdateUserType | UpdateAdminUserType) {
    return await this.db.user.update({ where: { id: id }, data: body });
  }

  async deleteUser(id: string) {
    return await this.db.user.delete({ where: { id: id } });
  }
}
