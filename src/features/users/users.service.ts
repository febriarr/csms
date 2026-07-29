import { SelectUsers } from '../../database';
import { NotFoundError } from '../../shared/errors';
import { AuthenticationError } from '../../shared/errors/authentication-error';
import { UsersRepository } from './users.repository';
import { ResponseUserDto } from './users.response.dto';
import { CreateUserInput } from './users.validator';
import * as bcrypt from 'bcrypt';

export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findMany(): Promise<ResponseUserDto[]> {
    const users = await this.usersRepository.findMany();

    return users.map(u => this.toResponse(u));
  }

  async create(input: CreateUserInput): Promise<ResponseUserDto> {
    const hashedPassword = await bcrypt.hash(input.password, 10);

    const user = await this.usersRepository.create({
      ...input,
      password: hashedPassword,
    });

    return this.toResponse(user);
  }

  async validateUser(email: string, password: string): Promise<ResponseUserDto> {
    const user = await this.usersRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundError('User Not found.');
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      throw new AuthenticationError('Credentials invalid');
    }

    return this.toResponse(user);
  }

  private toResponse(data: SelectUsers): ResponseUserDto {
    return new ResponseUserDto({
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: data.role,
    });
  }
}
