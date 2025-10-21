import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { OkPacket, RowDataPacket } from 'mysql2';

@Injectable()
export class PositionsService {
  constructor(private db: DatabaseService) {}

  private pool = () => this.db.getPool();

  async createPositions(position_code: string, position_name: string, user_id: number) {
    if (!position_code || typeof position_code !== 'string') {
      throw new BadRequestException('position_code is required and must be a string');
    }
    if (!position_name || typeof position_name !== 'string') {
      throw new BadRequestException('position_name is required and must be a string');
    }
    if (!user_id || typeof user_id !== 'number') {
      throw new BadRequestException('user_id is required (from authenticated user)');
    }

    // Ensure referenced user exists
    const [userRows] = await this.pool().execute<RowDataPacket[]>(
      'SELECT id FROM users WHERE id = ?',
      [user_id],
    );
    if (!userRows || (userRows as any).length === 0) {
      throw new BadRequestException('Referenced user_id does not exist');
    }

    const [result] = await this.pool().execute<OkPacket>(
      'INSERT INTO positions (position_code, position_name, user_id) VALUES (?, ?, ?)',
      [position_code, position_name, user_id],
    );
    return { position_id: result.insertId, position_code, position_name, user_id };
  }

  async findByUsername(username: string) {
    const [rows] = await this.pool().execute<RowDataPacket[]>(
      'SELECT id, username, password, role, refresh_token FROM users WHERE username = ?',
      [username],
    );
    return rows[0];
  }

  async findById(id: number) {
    const [rows] = await this.pool().execute<RowDataPacket[]>(
      'SELECT position_id, position_code, position_name, user_id, created_at, updated_at FROM positions WHERE position_id = ?',
      [id],
    );
    return rows[0];
  }

  async getAll() {
    const [rows] = await this.pool().execute<RowDataPacket[]>(
      'SELECT position_id, position_code, position_name, user_id, created_at, updated_at FROM positions',
    );
    return rows;
  }

  async updatepositions(position_id: number, partial: { position_code?: string; position_name?: string }) {
    const fields: string[] = [];
    const values: any[] = [];

    if (partial.position_code) {
      fields.push('position_code = ?');
      values.push(partial.position_code);
    }
    if (partial.position_name) {
      fields.push('position_name = ?');
      values.push(partial.position_name);
    }

    if (fields.length === 0) return await this.findById(position_id);

    values.push(position_id);
    await this.pool().execute(`UPDATE positions SET ${fields.join(', ')} WHERE position_id = ?`, values);
    return this.findById(position_id);
  }

  async deletePosition(position_id: number) {
    const [res] = await this.pool().execute<OkPacket>('DELETE FROM positions WHERE position_id = ?', [position_id]);
    return res.affectedRows === 1;
  }

  async setRefreshToken(id: number, refreshToken: string | null) {
    await this.pool().execute('UPDATE users SET refresh_token = ? WHERE id = ?', [refreshToken, id]);
  }

  async findByRefreshToken(refreshToken: string) {
    const [rows] = await this.pool().execute<RowDataPacket[]>(
      'SELECT id, username, role FROM users WHERE refresh_token = ?',
      [refreshToken],
    );
    return rows[0];
  }
}
