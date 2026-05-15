import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Score } from './score.entity';

@Entity()
export class WeeklySeed {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  seedUrl!: string;

  @Column()
  preset!: string;

  @Column()
  version!: string;

  @Column({ type: 'text', nullable: true })
  settings!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ default: true })
  isActive!: boolean;

  @OneToMany(() => Score, (score) => score.seed)
  scores!: Score[];
}
