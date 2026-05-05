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
  id: number;

  @Column()
  playerName: string;

  @Column()
  time: string; // Format HH:MM:SS, "ff", or "forfeit"

  @Column({ nullable: true })
  comment: string;

  @Column({ nullable: true })
  vodUrl: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => WeeklySeed, (seed) => seed.scores)
  seed: WeeklySeed;
}
