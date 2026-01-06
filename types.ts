
export type Station = 'Tompobulu' | 'Biringbulu' | 'Bungaya';

export interface Assignment {
  id: string;
  courierName: string;
  packageCount: number;
  station: Station;
  taskId: string;
  status: 'Pending' | 'Ongoing' | 'Completed';
  lastUpdated: string;
}

export interface GroupedAssignment {
  courierName: string;
  station: Station;
  totalPackages: number;
  tasks: Assignment[];
  status: 'Pending' | 'Ongoing' | 'Completed';
  lastUpdated: string;
}

export interface StationSummary {
  totalPackages: number;
  totalCouriers: number;
  completedTasks: number;
}
