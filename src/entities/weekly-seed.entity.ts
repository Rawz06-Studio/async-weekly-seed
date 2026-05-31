import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  ManyToOne,
} from 'typeorm';
import { Score } from './score.entity';
import { Leaderboard } from './leaderboard.entity';

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

  @Column({ type: 'text', nullable: true })
  francoOptions!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ default: true })
  isActive!: boolean;

  @ManyToOne(() => Leaderboard, (lb) => lb.seeds, { nullable: true })
  leaderboard!: Leaderboard | null;

  @OneToMany(() => Score, (score) => score.seed)
  scores!: Score[];
}
