import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class PresetQueueItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  preset!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
