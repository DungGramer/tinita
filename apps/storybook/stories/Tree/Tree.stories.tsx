import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Tree } from 'tinita-react/ui/tree';
import type { TreeNode } from 'tinita-react/ui/tree';

/**
 * `Tree` là primitive. Nó nhận dữ liệu dạng cây và không biết gì về file, về phần
 * mở rộng, hay về cú pháp cây CLI - `FileTree` mới là adapter cho những thứ đó.
 *
 * Tách như vậy để component không bị khoá vào một định dạng chuỗi. Có sẵn dữ liệu
 * dạng cây thì dùng thẳng `Tree`, đừng chuyển ngược về chuỗi rồi parse lại.
 */
const nodes: TreeNode[] = [
  {
    id: 'docs',
    name: 'Tài liệu',
    description: 'Mọi thứ người đọc cần',
    children: [
      { id: 'docs/bat-dau', name: 'Bắt đầu', description: 'Cài trong 2 phút' },
      { id: 'docs/api', name: 'API', description: 'Tham chiếu đầy đủ' },
      { id: 'docs/trong', name: 'Chưa viết', children: [] },
    ],
  },
  {
    id: 'thiet-ke',
    name: 'Thiết kế',
    children: [
      {
        id: 'thiet-ke/token',
        name: 'Token',
        description: 'Màu, khoảng cách, chữ',
      },
      { id: 'thiet-ke/motion', name: 'Chuyển động' },
    ],
  },
  { id: 'changelog', name: 'Changelog', description: 'Có gì mới' },
];

const meta = {
  title: 'UI/Tree',
  component: Tree,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Primitive cây tổng quát. Không phụ thuộc thư viện icon. Bàn phím theo chuẩn ARIA tree: mũi tên lên/xuống di chuyển, phải mở, trái đóng hoặc về cha, Home/End, `*` mở hết anh em, và gõ chữ để nhảy tới.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    sort: { control: 'select', options: ['none', 'name', 'type'] },
    overflow: { control: 'select', options: ['scroll', 'truncate', 'wrap'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    borderRadius: { control: 'select', options: ['sm', 'md', 'lg'] },
    showDescriptions: { control: 'boolean' },
    indicator: { control: 'boolean' },
    showArrow: { control: 'boolean' },
    enableAnimation: { control: 'boolean' },
  },
} satisfies Meta<typeof Tree>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { nodes, 'aria-label': 'Tài liệu' },
};

export const Arrows: Story = {
  name: 'Mũi tên mở/đóng',
  args: { nodes, 'showArrow': true, 'aria-label': 'Tài liệu' },
};

/** `sort="type"` đưa thư mục lên trước, rồi tới file, mỗi nhóm theo tên tự nhiên. */
export const SortByType: Story = {
  name: 'Sắp xếp theo loại',
  args: { nodes, 'sort': 'type', 'showArrow': true, 'aria-label': 'Tài liệu' },
};

export const SortByName: Story = {
  name: 'Sắp xếp theo tên',
  args: { nodes, 'sort': 'name', 'showArrow': true, 'aria-label': 'Tài liệu' },
};

/** Chú thích hiện hết ở hàng. Không đủ chỗ thì chú thích co trước, tên giữ nguyên. */
export const DescriptionsInline: Story = {
  name: 'Chú thích inline',
  args: {
    nodes,
    'showDescriptions': true,
    'showArrow': true,
    'aria-label': 'Tài liệu',
  },
};

/**
 * Chỉ nhánh được nêu hiện chú thích inline. Phần còn lại vào tooltip, và node nào
 * có chú thích đều mang dấu `?` ở cuối hàng.
 */
export const DescriptionsScoped: Story = {
  name: 'Chú thích theo nhánh',
  args: {
    nodes,
    'showDescriptions': 'docs',
    'showArrow': true,
    'aria-label': 'Tài liệu',
  },
};

export const Selected: Story = {
  name: 'Đang chọn',
  args: {
    nodes,
    'selected': 'docs/api',
    'showArrow': true,
    'aria-label': 'Tài liệu',
  },
};

/** Cây con đóng sẵn: dùng để thấy chúng KHÔNG nằm trong DOM cho tới khi mở. */
export const Collapsed: Story = {
  name: 'Đóng sẵn',
  args: {
    nodes,
    'defaultExpanded': false,
    'showArrow': true,
    'aria-label': 'Tài liệu',
  },
};

/** `renderNode` nhận `defaultContent` nên bọc được thay vì phải dựng lại từ đầu. */
export const CustomRender: Story = {
  name: 'renderNode',
  args: {
    nodes,
    'showArrow': true,
    'aria-label': 'Tài liệu',
    'renderNode': (node, ctx) => (
      <>
        {ctx.defaultContent}
        {ctx.isFolder && (
          <span
            style={{
              marginInlineStart: 'auto',
              fontSize: 11,
              opacity: 0.55,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {node.children?.length ?? 0}
          </span>
        )}
      </>
    ),
  },
};

/**
 * RTL: thụt lề, đường kẻ chỉ mục và mũi tên đều lật sang phải. Mũi tên trái/phải
 * trên bàn phím cũng đảo nghĩa.
 */
export const RTL: Story = {
  name: 'RTL (tiếng Ả Rập)',
  args: {
    'aria-label': 'شجرة',
    'showArrow': true,
    'showDescriptions': true,
    'nodes': [
      {
        id: 'المستندات',
        name: 'المستندات',
        description: 'كل ما يحتاجه القارئ',
        children: [
          {
            id: 'المستندات/البداية',
            name: 'البداية',
            description: 'التثبيت في دقيقتين',
          },
          {
            id: 'المستندات/Button.tsx',
            name: 'Button.tsx',
            description: 'اسم ملف لاتيني',
          },
        ],
      },
      { id: 'التغييرات', name: 'التغييرات' },
    ],
  },
  render: (args) => (
    <div dir="rtl">
      <Tree {...args} />
    </div>
  ),
};

/** Kiểm soát từ ngoài: `expanded` + `onExpandedChange`. */
export const Controlled: Story = {
  name: 'Kiểm soát expanded',
  args: { nodes, 'aria-label': 'Tài liệu' },
  render: (args) => {
    const [expanded, setExpanded] = useState<string[]>(['docs']);
    return (
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setExpanded(['docs', 'thiet-ke'])}
          >
            Mở hết
          </button>
          <button type="button" onClick={() => setExpanded([])}>
            Đóng hết
          </button>
          <code style={{ fontSize: 12, alignSelf: 'center' }}>
            expanded = [{expanded.join(', ')}]
          </code>
        </div>
        <Tree
          {...args}
          expanded={expanded}
          onExpandedChange={setExpanded}
          showArrow
        />
      </div>
    );
  },
};

/**
 * Cây lớn để đo. 6 cấp, ~1500 node.
 *
 * Đây là hình dạng mà chi phí đóng/mở mới nhìn thấy được: cây con đang đóng KHÔNG
 * nằm trong DOM, nên mở một nhánh chỉ dựng đúng nhánh đó.
 */
function buildStressTree(
  depth: number,
  breadth: number,
  prefix = 'n'
): TreeNode[] {
  if (depth === 0) return [];
  return Array.from({ length: breadth }, (_, i) => {
    const id = `${prefix}-${i}`;
    const children = buildStressTree(depth - 1, breadth, id);
    return depth === 1
      ? { id, name: `tệp-${i}.ts` }
      : { id, name: `thư-mục-${i}`, children };
  });
}

export const Stress: Story = {
  name: 'Cây lớn (đo hiệu năng)',
  args: {
    'nodes': buildStressTree(5, 4),
    'defaultExpanded': false,
    'showArrow': true,
    'aria-label': 'Cây lớn',
  },
};

/**
 * Nhãn dài trong khung hẹp, cho `Tree` thuần (không có `FileTree` tách đuôi).
 *
 * `nameSuffix` là của NODE, không phải suy ra từ tên: `Tree` không biết gì về file.
 * Ở đây truyền tay để thấy đuôi vẫn hiện khi tên bị rút.
 */
const longNodes: TreeNode[] = [
  {
    id: 'src',
    name: 'src',
    children: [
      {
        id: 'src/a',
        name: 'UserProfileSettingsDialogContainer.stories',
        nameSuffix: '.tsx',
      },
      {
        id: 'src/b',
        name: 'AuthenticationProviderConfiguration',
        nameSuffix: '.ts',
      },
      { id: 'src/c', name: 'index', nameSuffix: '.ts' },
    ],
  },
];

export const Overflow: Story = {
  name: 'Nhãn dài (overflow)',
  args: { 'nodes': longNodes, 'showArrow': true, 'aria-label': 'Nhãn dài' },
  render: (args) => (
    <div style={{ display: 'grid', gap: 20, maxInlineSize: 320 }}>
      {(['scroll', 'truncate', 'wrap'] as const).map((mode) => (
        <div key={mode} style={{ display: 'grid', gap: 4 }}>
          <code style={{ fontSize: 12 }}>overflow=&quot;{mode}&quot;</code>
          <div style={{ border: '1px dashed currentColor', opacity: 0.999 }}>
            <Tree {...args} overflow={mode} />
          </div>
        </div>
      ))}
    </div>
  ),
};
