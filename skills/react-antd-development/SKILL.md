---
name: react-antd-development
description: React 19 + Ant Design 6 development patterns, hooks usage, and component best practices for LifeManager
---

# React + Ant Design Development

## Overview

Best practices for building React components with Ant Design, focusing on hooks, state management, and modern patterns.

## When to Use

- Creating new React components
- Implementing forms and data display
- Managing component state
- Integrating Ant Design components
- Performance optimization

## Component Structure

### Functional Components Pattern

```typescript
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Modal, Form, Input, message } from 'antd';
import type { FC } from 'react';

interface MyComponentProps {
  id: string;
  onSave?: (data: any) => void;
  visible?: boolean;
}

export const MyComponent: FC<MyComponentProps> = ({ 
  id, 
  onSave,
  visible = false 
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  
  // Effects
  useEffect(() => {
    if (visible) {
      fetchData();
    }
  }, [visible]);
  
  // Handlers
  const handleSubmit = useCallback(async (values: any) => {
    setLoading(true);
    try {
      await window.electronAPI.saveData(values);
      message.success('保存成功');
      onSave?.(values);
    } catch (error) {
      message.error('保存失败');
    } finally {
      setLoading(false);
    }
  }, [onSave]);
  
  return (
    <Modal open={visible} onOk={form.submit}>
      <Form form={form} onFinish={handleSubmit}>
        <Form.Item name="title" label="标题" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
};
```

## Ant Design Patterns

### Form Handling

```typescript
const [form] = Form.useForm();

// Set values
form.setFieldsValue({ name: 'value' });

// Get values
const values = form.getFieldsValue();

// Validate
try {
  await form.validateFields();
} catch (error) {
  console.error('Validation failed:', error);
}

// Reset
form.resetFields();
```

### Modal Patterns

```typescript
// Controlled Modal
const [visible, setVisible] = useState(false);

<Modal
  open={visible}
  onOk={handleOk}
  onCancel={() => setVisible(false)}
  confirmLoading={loading}
>
  {/* Content */}
</Modal>

// Modal.confirm for quick dialogs
Modal.confirm({
  title: '确认删除?',
  content: '此操作不可撤销',
  onOk: async () => {
    await deleteItem();
  }
});
```

### Table with Actions

```typescript
const columns = [
  {
    title: '名称',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: '操作',
    key: 'action',
    render: (_: any, record: Task) => (
      <Space>
        <Button 
          type="link" 
          onClick={() => handleEdit(record)}
        >
          编辑
        </Button>
        <Popconfirm
          title="确认删除?"
          onConfirm={() => handleDelete(record.id)}
        >
          <Button type="link" danger>删除</Button>
        </Popconfirm>
      </Space>
    ),
  },
];

<Table 
  dataSource={data} 
  columns={columns}
  rowKey="id"
  loading={loading}
/>
```

### Message and Notification

```typescript
// Success message
message.success('操作成功');

// Error message
message.error('操作失败');

// Notification with details
notification.open({
  message: '任务完成',
  description: '已完成 5 个任务',
  duration: 3,
});
```

## State Management

### Local State

```typescript
// Simple state
const [count, setCount] = useState(0);

// Object state (immutable updates)
const [task, setTask] = useState<Task>({});

// Update object state
setTask(prev => ({
  ...prev,
  title: 'New Title'
}));

// Array state
const [items, setItems] = useState<Item[]>([]);

// Add item
setItems(prev => [...prev, newItem]);

// Update item
setItems(prev => 
  prev.map(item => 
    item.id === id ? { ...item, ...updates } : item
  )
);

// Remove item
setItems(prev => prev.filter(item => item.id !== id));
```

### Context for Global State

```typescript
// context/AppContext.tsx
interface AppContextType {
  tasks: Task[];
  updateTasks: (tasks: Task[]) => void;
}

export const AppContext = createContext<AppContextType>(null!);

export const AppProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  
  const updateTasks = useCallback((newTasks: Task[]) => {
    setTasks(newTasks);
  }, []);
  
  return (
    <AppContext.Provider value={{ tasks, updateTasks }}>
      {children}
    </AppContext.Provider>
  );
};

// Usage in component
const { tasks, updateTasks } = useContext(AppContext);
```

## Custom Hooks

### Data Fetching Hook

```typescript
// hooks/useData.ts
export const useData = <T,>(key: string) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await window.electronAPI.getData(key);
        setData(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [key]);
  
  const refetch = useCallback(async () => {
    setLoading(true);
    const result = await window.electronAPI.getData(key);
    setData(result);
    setLoading(false);
  }, [key]);
  
  return { data, loading, error, refetch };
};

// Usage
const { data: tasks, loading, refetch } = useData<Task[]>('tasks');
```

### IPC Event Listener Hook

```typescript
// hooks/useIPCListener.ts
export const useIPCListener = (
  channel: string, 
  handler: (data: any) => void
) => {
  useEffect(() => {
    const listener = (data: any) => handler(data);
    window.electronAPI.on(channel, listener);
    
    return () => {
      window.electronAPI.off(channel, listener);
    };
  }, [channel, handler]);
};

// Usage
useIPCListener('tasks-updated', (tasks) => {
  setTasks(tasks);
});
```

## Performance Optimization

### React.memo

```typescript
// Prevent re-render if props unchanged
export const TaskItem = React.memo<TaskItemProps>(({ task, onUpdate }) => {
  return <div>{task.title}</div>;
});

// Custom comparison
export const TaskItem = React.memo<TaskItemProps>(
  ({ task }) => <div>{task.title}</div>,
  (prev, next) => prev.task.id === next.task.id
);
```

### useMemo

```typescript
// Expensive computation
const sortedTasks = useMemo(() => {
  return tasks.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}, [tasks]);

// Filter data
const completedTasks = useMemo(() => 
  tasks.filter(t => t.status === 'completed'),
  [tasks]
);
```

### useCallback

```typescript
// Prevent function recreation
const handleUpdate = useCallback((id: string, updates: Partial<Task>) => {
  setTasks(prev => 
    prev.map(task => 
      task.id === id ? { ...task, ...updates } : task
    )
  );
}, []);

// Pass to child components
<TaskItem task={task} onUpdate={handleUpdate} />
```

### Lazy Loading

```typescript
// Code splitting
const HeavyComponent = lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<Spin />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

## Ant Design 6 Specific

### Deprecated Components

```typescript
// ❌ DON'T use deprecated List
import { List } from 'antd';

// ✅ DO use alternative or suppress warning
// (Ant Design team recommends alternatives in docs)
```

### Theme Customization

```typescript
// App.tsx
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';

<ConfigProvider
  locale={zhCN}
  theme={{
    token: {
      colorPrimary: '#1890ff',
      borderRadius: 4,
    },
  }}
>
  <App />
</ConfigProvider>
```

### Form.Item Rules

```typescript
<Form.Item
  name="email"
  rules={[
    { required: true, message: '请输入邮箱' },
    { type: 'email', message: '邮箱格式不正确' },
    {
      validator: async (_, value) => {
        if (value && value.length < 5) {
          throw new Error('邮箱太短');
        }
      }
    }
  ]}
>
  <Input />
</Form.Item>
```

## Common Patterns in LifeManager

### Task Management

```typescript
const TaskManager: FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Fetch on mount
  useEffect(() => {
    fetchTasks();
  }, []);
  
  // Listen for updates
  useIPCListener('tasks-updated', (newTasks) => {
    setTasks(newTasks);
  });
  
  const fetchTasks = async () => {
    setLoading(true);
    const data = await window.electronAPI.db.read();
    setTasks(data.tasks);
    setLoading(false);
  };
  
  const updateTask = async (id: string, updates: Partial<Task>) => {
    const updatedTasks = tasks.map(t => 
      t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
    );
    
    await window.electronAPI.db.update('tasks', updatedTasks);
    setTasks(updatedTasks);
  };
  
  return (
    <Spin spinning={loading}>
      {tasks.map(task => (
        <TaskItem 
          key={task.id} 
          task={task} 
          onUpdate={updateTask}
        />
      ))}
    </Spin>
  );
};
```

### Modal Form Pattern

```typescript
const TaskModal: FC<TaskModalProps> = ({ visible, task, onClose }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (visible && task) {
      form.setFieldsValue(task);
    } else {
      form.resetFields();
    }
  }, [visible, task, form]);
  
  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      if (task) {
        await window.electronAPI.updateTask(task.id, values);
      } else {
        await window.electronAPI.createTask(values);
      }
      message.success('保存成功');
      onClose(true);
    } catch (error) {
      message.error('保存失败');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Modal
      open={visible}
      title={task ? '编辑任务' : '新建任务'}
      onCancel={() => onClose(false)}
      onOk={() => form.submit()}
      confirmLoading={loading}
    >
      <Form form={form} onFinish={handleSubmit} layout="vertical">
        <Form.Item 
          name="title" 
          label="标题" 
          rules={[{ required: true, message: '请输入标题' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item name="description" label="描述">
          <Input.TextArea rows={4} />
        </Form.Item>
      </Form>
    </Modal>
  );
};
```

## Testing

### Component Testing

```typescript
// TaskItem.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskItem } from './TaskItem';

describe('TaskItem', () => {
  const mockTask = {
    id: '1',
    title: 'Test Task',
    status: 'todo'
  };
  
  it('renders task title', () => {
    render(<TaskItem task={mockTask} />);
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });
  
  it('calls onUpdate when clicked', async () => {
    const onUpdate = vi.fn();
    render(<TaskItem task={mockTask} onUpdate={onUpdate} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(onUpdate).toHaveBeenCalledWith('1', expect.any(Object));
  });
});
```

### Form Testing

```typescript
it('validates required fields', async () => {
  render(<TaskModal visible={true} />);
  
  fireEvent.click(screen.getByText('确定'));
  
  await waitFor(() => {
    expect(screen.getByText('请输入标题')).toBeInTheDocument();
  });
});
```

## Anti-Patterns

### ❌ DON'T: Mutate State Directly

```typescript
// BAD
tasks[0].title = 'New Title';
setTasks(tasks);
```

### ✅ DO: Create New Objects

```typescript
// GOOD
setTasks(prev => 
  prev.map((task, i) => 
    i === 0 ? { ...task, title: 'New Title' } : task
  )
);
```

### ❌ DON'T: Missing Dependencies

```typescript
// BAD - missing 'id' in deps
useEffect(() => {
  fetchData(id);
}, []);
```

### ✅ DO: Include All Dependencies

```typescript
// GOOD
useEffect(() => {
  fetchData(id);
}, [id]);
```

### ❌ DON'T: Inline Functions in Render

```typescript
// BAD - creates new function on every render
{tasks.map(task => (
  <TaskItem 
    task={task} 
    onUpdate={(updates) => handleUpdate(task.id, updates)}
  />
))}
```

### ✅ DO: Use useCallback or Stable References

```typescript
// GOOD
const handleUpdate = useCallback((id: string, updates: any) => {
  // ...
}, []);

{tasks.map(task => (
  <TaskItem task={task} onUpdate={handleUpdate} />
))}
```

## Checklist

Before completing React component work:

- [ ] Component uses TypeScript with proper types
- [ ] Props interface defined and exported
- [ ] State updates are immutable
- [ ] useEffect dependencies are correct
- [ ] Event handlers use useCallback when passed to children
- [ ] Expensive computations use useMemo
- [ ] Forms use Ant Design Form component
- [ ] Error handling with try/catch and message.error
- [ ] Loading states shown with Spin or Button loading
- [ ] Component has tests
- [ ] No console warnings in development
- [ ] Ant Design deprecation warnings addressed

## Resources

- [React Hooks](https://react.dev/reference/react)
- [Ant Design Components](https://ant.design/components/overview/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
