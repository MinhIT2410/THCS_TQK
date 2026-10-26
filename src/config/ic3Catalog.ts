export type Grade = '6' | '7' | '8';
export type PracticeOption = {
  id: string;
  name: string;
  url: string | null;
  status: 'ready' | 'coming_soon';
};

type TopicConfig = {
  code: string;
  title: string;
  tests: number[];
};

export type LevelConfig = {
  levelCode: string;
  levelLabel: string;
  gradeLabel: string;
  topics: TopicConfig[];
  includeExtensionTopic?: boolean;
};

export const LEVELS: Record<Grade, LevelConfig> = {
  '6': {
    levelCode: 'IC3GS6L1',
    levelLabel: 'IC3 GS6 Level 1',
    gradeLabel: 'Khối 6',
    topics: [
      { code: 'CD1', title: 'Căn Bản Về Công Nghệ', tests: [1, 2] },
      { code: 'CD2', title: 'Quản Lí Thông Tin', tests: [1] },
      { code: 'CD3', title: 'Công Dân Số', tests: [1, 2] },
      { code: 'CD4', title: 'Truyền Thông', tests: [1] },
      { code: 'CD5', title: 'An Toàn Và Bảo Mật', tests: [1] },
      { code: 'CD6', title: 'Sáng Tạo Nội Dung', tests: [1] },
      { code: 'CD7', title: 'Cộng Tác', tests: [1] },
    ],
    includeExtensionTopic: true,
  },
  '7': {
    levelCode: 'IC3GS6L2',
    levelLabel: 'IC3 GS6 Level 2',
    gradeLabel: 'Khối 7',
    topics: [
      { code: 'CD1', title: 'Căn Bản Về Công Nghệ', tests: [1, 2, 3] },
      { code: 'CD2', title: 'Giao tiếp kĩ thuật số', tests: [1, 2] },
      { code: 'CD3', title: 'Công Dân Số', tests: [1] },
      { code: 'CD4', title: 'Quản Lí Thông Tin', tests: [1] },
      { code: 'CD5', title: 'Sáng Tạo Nội Dung', tests: [1, 2] },
      { code: 'CD6', title: 'Cộng Tác', tests: [1] },
      { code: 'CD7', title: 'An Toàn Và Bảo Mật', tests: [1, 2] },
    ],
    includeExtensionTopic: true,
  },
  '8': {
    levelCode: 'IC3GS6L3',
    levelLabel: 'IC3 GS6 Level 3',
    gradeLabel: 'Khối 8',
    topics: [
      { code: 'CD1', title: 'Căn Bản Về Công Nghệ', tests: [1, 2, 3] },
      { code: 'CD2', title: 'Giao Tiếp Kĩ Thuật Số', tests: [1, 2] },
      { code: 'CD3', title: 'Công Dân Số', tests: [1, 2] },
      { code: 'CD4', title: 'Quản Lí Thông Tin', tests: [1, 2, 3] },
      { code: 'CD5', title: 'Sáng Tạo Nội Dung', tests: [1, 2] },
      { code: 'CD6', title: 'Cộng Tác', tests: [1] },
      { code: 'CD7', title: 'An Toàn Và Bảo Mật', tests: [1] },
    ],
    includeExtensionTopic: true,
  },
};

function buildIigUrl(levelCode: string, topicCode: string, testNumber: number) {
  const folder = `${levelCode}-${topicCode}-T${testNumber} (Published)`;
  return `https://ic3review.iigvietnam.edu.vn/newdata/${levelCode}/${encodeURIComponent(folder)}/index.html`;
}

function buildOptions(config: LevelConfig): PracticeOption[] {
  const options: PracticeOption[] = [];

  config.topics.forEach((topic, topicIndex) => {
    topic.tests.forEach((testNumber) => {
      options.push({
        id: `${config.levelCode}-${topic.code}-T${testNumber}`,
        name: `Chủ Đề ${topicIndex + 1}: ${topic.title} - Test ${testNumber}`,
        url: buildIigUrl(config.levelCode, topic.code, testNumber),
        status: 'ready',
      });
    });
  });

  if (config.includeExtensionTopic) {
    options.push({
      id: `${config.levelCode}-EXT`,
      name: 'Chủ đề mở rộng',
      url: null,
      status: 'coming_soon',
    });
  }

  return options;
}

export const TESTS: Record<Grade, PracticeOption[]> = {
  '6': buildOptions(LEVELS['6']),
  '7': buildOptions(LEVELS['7']),
  '8': buildOptions(LEVELS['8']),
};

