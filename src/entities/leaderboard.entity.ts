import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { WeeklySeed } from './weekly-seed.entity';
import { PresetQueueItem } from './preset-queue-item.entity';

@Entity()
export class Leaderboard {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ type: 'text' })
  presetWeights!: string;

  @OneToMany(() => WeeklySeed, (seed) => seed.leaderboard)
  seeds!: WeeklySeed[];

  @OneToMany(() => PresetQueueItem, (item) => item.leaderboard)
  queue!: PresetQueueItem[];
}
