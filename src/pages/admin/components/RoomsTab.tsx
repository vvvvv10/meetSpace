/**
 * 管理中心 · 会议室管理
 *
 * 会议室数据来自本地演示数据仓库（meetStore），支持：
 * 新增 / 编辑（ModalForm + ProForm）与删除（Popconfirm）。
 * 新增房间从 floor 字符串解析 floorNum（如 6F → 6），并自动带 custom 标记。
 */
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import {
  ModalForm,
  ProFormCheckbox,
  ProFormDigit,
  ProFormSelect,
  ProFormText,
} from '@ant-design/pro-components';
import type { TableColumnsType } from 'antd';
import { App, Button, Form, Popconfirm, Space, Table, Tag } from 'antd';
import { createStyles } from 'antd-style';
import React, { useEffect, useState } from 'react';
import type { Equipment, Room, RoomStatus } from '@/store/meetStore';
import {
  ALL_EQUIPMENTS,
  addRoom,
  deleteRoom,
  updateRoom,
  useMeetState,
} from '@/store/meetStore';
import { palette } from '@/styles/theme';

const useStyles = createStyles(({ css, token }) => ({
  card: css`
    background: ${palette.surface};
    border: 1px solid ${palette.border};
    border-radius: ${palette.radiusCard}px;
    box-shadow: ${palette.shadowCard};
    padding: 16px 18px;
  `,
  header: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 14px;
  `,
  headerTitle: css`
    font-size: 15px;
    font-weight: 600;
    color: ${token.colorText};
  `,
  headerDesc: css`
    margin-top: 2px;
    font-size: 13px;
    color: ${token.colorTextSecondary};
  `,
}));

const ROOM_STATUS_TAG: Record<RoomStatus, React.ReactNode> = {
  available: <Tag color="success">可用</Tag>,
  maintenance: <Tag color="default">维护中</Tag>,
};

/** 会议室表单值 */
interface RoomFormValues {
  name: string;
  building: string;
  floor: string;
  capacity: number;
  equipment: Equipment[];
  status: RoomStatus;
}

/** 新增时的默认值（覆盖全部字段，避免残留上一次的输入） */
const ADD_DEFAULTS: RoomFormValues = {
  name: '',
  building: 'A座',
  floor: '',
  capacity: 8,
  equipment: [],
  status: 'available',
};

const toFormValues = (room: Room): RoomFormValues => ({
  name: room.name,
  building: room.building,
  floor: room.floor,
  capacity: room.capacity,
  equipment: room.equipment,
  status: room.status,
});

/** 会议室管理 Tab */
const RoomsTab: React.FC = () => {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const state = useMeetState();
  const [form] = Form.useForm<RoomFormValues>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);

  // 打开弹窗时先清掉上一次的校验错误，再写入当前模式的值
  useEffect(() => {
    if (!modalOpen) return;
    form.resetFields();
    form.setFieldsValue(editing ? toFormValues(editing) : ADD_DEFAULTS);
  }, [modalOpen, editing, form]);

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (room: Room) => {
    setEditing(room);
    setModalOpen(true);
  };

  const columns: TableColumnsType<Room> = [
    { title: '会议室名', dataIndex: 'name', width: 140 },
    { title: '楼座', dataIndex: 'building', width: 90 },
    { title: '楼层', dataIndex: 'floor', width: 80 },
    {
      title: '容纳人数',
      dataIndex: 'capacity',
      width: 100,
      render: (_, room) => `${room.capacity} 人`,
    },
    {
      title: '设备',
      key: 'equipment',
      render: (_, room) => (
        <Space size={4} wrap>
          {room.equipment.map((item) => (
            <Tag key={item}>{item}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_, room) => ROOM_STATUS_TAG[room.status],
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_, room) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEdit(room)}
          >
            编辑
          </Button>
          <Popconfirm
            title={`确定删除会议室「${room.name}」吗？`}
            description="该会议室上的手工预订会一并删除"
            okText="删除"
            cancelText="取消"
            onConfirm={() => {
              deleteRoom(room.id);
              message.success(`会议室「${room.name}」已删除`);
            }}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <div className={styles.headerTitle}>会议室列表</div>
          <div className={styles.headerDesc}>
            共 {state.rooms.length} 间 · 数据存储于本地演示仓库
          </div>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
          新增会议室
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={state.rooms}
        pagination={false}
      />

      <ModalForm<RoomFormValues>
        form={form}
        open={modalOpen}
        onOpenChange={(visible) => {
          if (!visible) {
            setModalOpen(false);
            setEditing(null);
          }
        }}
        title={editing ? '编辑会议室' : '新增会议室'}
        width={560}
        grid
        rowProps={{ gutter: 16 }}
        colProps={{ span: 12 }}
        modalProps={{
          centered: true,
          destroyOnHidden: true,
          okText: '保存',
          cancelText: '取消',
        }}
        onFinish={async (values) => {
          const floorNum = Number.parseInt(values.floor, 10);
          if (editing) {
            updateRoom(editing.id, { ...values, floorNum });
            message.success(`会议室「${values.name}」已更新`);
          } else {
            addRoom({ ...values, floorNum });
            message.success(`会议室「${values.name}」已新增`);
          }
          setModalOpen(false);
          setEditing(null);
          return true;
        }}
      >
        <ProFormText
          name="name"
          label="名称"
          placeholder="例如：极光"
          rules={[{ required: true, message: '请填写会议室名称' }]}
        />
        <ProFormSelect
          name="building"
          label="楼座"
          options={['A座', 'B座', 'C座']}
          rules={[{ required: true, message: '请选择楼座' }]}
        />
        <ProFormText
          name="floor"
          label="楼层"
          placeholder="如 6F"
          rules={[
            { required: true, message: '请填写楼层' },
            { pattern: /^\d+F$/, message: '格式需为「数字 + F」，如 6F' },
          ]}
        />
        <ProFormDigit
          name="capacity"
          label="容纳人数"
          min={1}
          max={500}
          rules={[
            { required: true, message: '请填写容纳人数' },
            {
              type: 'number',
              min: 1,
              max: 500,
              message: '容纳人数需在 1 - 500 之间',
            },
          ]}
        />
        <ProFormCheckbox.Group
          name="equipment"
          label="设备"
          options={ALL_EQUIPMENTS}
          rules={[
            { required: true, type: 'array', message: '请选择至少一项设备' },
          ]}
          colProps={{ span: 24 }}
        />
        <ProFormSelect
          name="status"
          label="状态"
          options={[
            { value: 'available', label: '可用' },
            { value: 'maintenance', label: '维护中' },
          ]}
          rules={[{ required: true, message: '请选择状态' }]}
        />
      </ModalForm>
    </div>
  );
};

export default RoomsTab;
