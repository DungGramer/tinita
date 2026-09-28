import type { Meta, StoryObj } from '@storybook/react-vite';
import { FileTree } from 'tinita-react/ui/file-tree';

const meta = {
  title: 'UI/FileTree',
  component: FileTree,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Adapter từ chuỗi cây (thụt lề hoặc CLI) sang `Tree`. Mọi hành vi nằm ở `Tree`; `FileTree` chỉ đọc chuỗi, gắn icon theo phần mở rộng, và đưa xuống. Có sẵn dữ liệu dạng cây thì dùng thẳng `Tree`.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    text: {
      control: 'text',
      description: 'Text tree input (indent or CLI format)',
    },
    className: {
      control: 'text',
      description: 'Custom class name',
    },
    hideRootName: {
      control: 'boolean',
      description: 'Hide root node when only 1 root exists',
    },
    theme: {
      control: 'select',
      options: ['dark', 'light'],
      description: 'Theme color scheme',
    },
    indicator: {
      control: 'boolean',
      description: 'Whether to show the tree indicator line',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size preset for density (padding)',
    },
    borderRadius: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Border radius for hover state',
    },
    showArrow: {
      control: 'boolean',
      description: 'Whether to show arrow icon for folders',
    },
    enableAnimation: {
      control: 'boolean',
      description: 'Enable smooth collapse/expand animations',
    },
  },
} satisfies Meta<typeof FileTree>;

export default meta;
type Story = StoryObj<typeof meta>;

// Example tree texts
const indentTreeText = `
content/
  1_photography/
    1_animals/
    2_trees/
    album.txt
    photo.jpg
    image.png
  2_notes/
    notes.md
    todo.json
  3_code/
    app.js
    styles.css
    config.yaml
`;

const cliTreeText = `
D:\\PROJECT
├───src
│   ├───components
│   │   ├───Button.tsx
│   │   ├───Input.tsx
│   │   └───Card.tsx
│   ├───utils
│   │   └───helpers.js
│   └───index.ts
├───public
│   ├───images
│   │   ├───logo.png
│   │   └───banner.jpg
│   └───favicon.ico
├───dist
│   └───index.js
├───package.json
├───README.md
└───.gitignore
`;

const complexTreeText = `
project/
  src/
    components/
      Button.tsx
      Input.tsx
      Card.tsx
    hooks/
      useToggle.ts
      useDebounce.ts
    utils/
      helpers.js
      constants.json
    styles/
      main.css
      theme.scss
  public/
    index.html
    favicon.ico
  tests/
    Button.test.ts
    helpers.test.js
  docs/
    README.md
    CONTRIBUTING.md
`;

export const Default: Story = {
  args: {
    text: indentTreeText,
    theme: 'light',
  },
};

export const CLITreeFormat: Story = {
  args: {
    text: cliTreeText,
  },
};

export const HideRootName: Story = {
  args: {
    text: cliTreeText,
    hideRootName: true,
  },
};

export const ComplexExample: Story = {
  args: {
    text: complexTreeText,
  },
};

export const WithArrows: Story = {
  args: {
    text: indentTreeText,
    showArrow: true,
  },
};

export const WithoutAnimation: Story = {
  args: {
    text: complexTreeText,
    enableAnimation: false,
  },
};

export const SmallSize: Story = {
  args: {
    text: indentTreeText,
    size: 'sm',
  },
};

export const LargeSize: Story = {
  args: {
    text: indentTreeText,
    size: 'lg',
  },
};

export const AllFeatures: Story = {
  args: {
    text: complexTreeText,
    theme: 'dark',
    size: 'md',
    borderRadius: 'md',
    showArrow: true,
    indicator: true,
    enableAnimation: true,
  },
};

/**
 * Cú pháp `?` trong chuỗi: khoảng trắng, dấu `?`, rồi chú thích.
 *
 * Dấu phân cách BẮT BUỘC có khoảng trắng đứng trước, nên tên file chứa `?`
 * (`foo?.ts`) không bị cắt nhầm.
 */
const DESCRIBED = [
  'project/',
  '├── src/                        ? Mã nguồn ứng dụng',
  '│   ├── components/             ? Component dùng lại được',
  '│   │   ├── Button.tsx          ? Nút bấm chính',
  '│   │   └── FileTree.tsx        ? Hiển thị cây thư mục',
  '│   ├── app.tsx                 ? Điểm vào ứng dụng',
  '│   └── index.ts                ? Export công khai',
  '├── package.json                ? Phụ thuộc và script',
  '└── README.md                   ? Tài liệu dự án',
].join('\n');

/** Mặc định: chú thích nằm trong tooltip, node nào có thì mang dấu `?` ở cuối. */
export const DescriptionsTooltip: Story = {
  name: 'Chú thích trong tooltip',
  args: { text: DESCRIBED, showArrow: true },
};

export const DescriptionsInline: Story = {
  name: 'Chú thích inline (tất cả)',
  args: { text: DESCRIBED, showArrow: true, showDescriptions: true },
};

/** Chỉ nhánh `src/components`; phần còn lại vẫn nằm trong tooltip. */
export const DescriptionsScoped: Story = {
  name: 'Chú thích theo nhánh',
  args: {
    text: DESCRIBED,
    showArrow: true,
    showDescriptions: 'project/src/components',
  },
};

export const SortByType: Story = {
  name: 'Sắp xếp theo loại',
  args: { text: DESCRIBED, showArrow: true, sort: 'type' },
};

export const SortByName: Story = {
  name: 'Sắp xếp theo tên',
  args: { text: DESCRIBED, showArrow: true, sort: 'name' },
};

/** `selected` nhận ĐƯỜNG DẪN đầy đủ, không phải tên file. */
export const Selected: Story = {
  name: 'Đang chọn một file',
  args: {
    text: DESCRIBED,
    showArrow: true,
    selected: 'project/src/components/Button.tsx',
  },
};

/** `showRoot={false}` bỏ node gốc, các con của nó lên làm cấp ngoài cùng. */
export const WithoutRoot: Story = {
  name: 'Ẩn node gốc',
  args: { text: DESCRIBED, showArrow: true, showRoot: false },
};

export const CustomIconColors: Story = {
  name: 'Màu icon tuỳ biến',
  args: {
    text: DESCRIBED,
    showArrow: true,
    iconColors: {
      folder: '#eab308',
      javascript: '#38bdf8',
      markdown: '#f472b6',
    },
  },
};

/** Cây con đóng sẵn - chúng KHÔNG nằm trong DOM cho tới khi mở. */
export const Collapsed: Story = {
  name: 'Đóng sẵn',
  args: { text: DESCRIBED, showArrow: true, defaultExpanded: false },
};

/**
 * RTL: thụt lề, đường kẻ chỉ mục và mũi tên lật sang phải; tên file latin vẫn
 * đọc đúng chiều nhờ `dir="auto"` trên từng nhãn.
 */
export const RightToLeft: Story = {
  name: 'RTL',
  args: { text: DESCRIBED, showArrow: true, showDescriptions: true },
  render: (args) => (
    <div dir="rtl">
      <FileTree {...args} />
    </div>
  ),
};
