import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { WeeklySeed } from './weekly-seed.entity';

@Entity()
export class Score {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  playerName!: string;

  @Column({ type: 'int', nullable: true })
  time!: number | null; // seconds since start, null = forfeit

  @Column({ nullable: true })
  comment!: string;

  @Column({ nullable: true })
  vodUrl!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => WeeklySeed, (seed) => seed.scores)
  seed!: WeeklySeed;
}
