import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Leaderboard } from './leaderboard.entity';

@Entity()
export class PresetQueueItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  preset!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => Leaderboard, (lb) => lb.queue, { nullable: true })
  leaderboard!: Leaderboard | null;
}
