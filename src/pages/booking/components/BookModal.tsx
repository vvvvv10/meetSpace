import {
  ModalForm,
  ProFormDatePicker,
  ProFormDigit,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { App, Form } from 'antd';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';
import { deptOf, getSession } from '@/services/auth';
import {
  createBooking,
  DAY_END,
  DAY_START,
  findConflict,
  todayStr,
  toTime,
  useMeetState,
} from '@/store/meetStore';

/** 30 分钟粒度的可选时段 08:00 - 20:00 */
const SLOTS: string[] = [];
for (let m = DAY_START; m <= DAY_END; m += 30) {
  SLOTS.push(toTime(m));
}

export interface BookPreset {
  roomId?: string;
  date?: string;
  startMin?: number;
}

interface Props {
  open: boolean;
  preset?: BookPreset;
  onClose: () => void;
  onCreated?: () => void;
}

/** 快速预订弹窗（提交时做冲突检测） */
const BookModal: React.FC<Props> = ({ open, preset, onClose, onCreated }) => {
  const { message } = App.useApp();
  const state = useMeetState();
  const session = getSession();
  const [form] = Form.useForm();
  const [roomId, setRoomId] = useState<string | undefined>(preset?.roomId);

  useEffect(() => {
    if (open) {
      setRoomId(preset?.roomId);
      form.setFieldsValue({
        start: toTime(preset?.startMin ?? 9 * 60),
        end: toTime(Math.min((preset?.startMin ?? 9 * 60) + 60, DAY_END)),
      });
    }
  }, [open, preset, form]);

  const room = state.rooms.find((r) => r.id === roomId);
  const roomOptions = state.rooms
    .filter((r) => r.status !== 'maintenance')
    .map((r) => ({
      label: `${r.name} · ${r.building} ${r.floor} · ${r.capacity}人`,
      value: r.id,
    }));

  return (
    <ModalForm
      form={form}
      open={open}
      onOpenChange={(visible) => {
        if (!visible) onClose();
      }}
      title="快速预订会议室"
      width={560}
      grid
      rowProps={{ gutter: 16 }}
      colProps={{ span: 12 }}
      modalProps={{
        destroyOnClose: true,
        centered: true,
        okText: '确认预订',
        cancelText: '取消',
      }}
      initialValues={{
        roomId: preset?.roomId,
        date: preset?.date ?? todayStr(),
        start: toTime(preset?.startMin ?? 9 * 60),
        end: toTime(Math.min((preset?.startMin ?? 9 * 60) + 60, DAY_END)),
        attendees: 4,
      }}
      onFinish={async (values) => {
        const v = values as {
          roomId?: string;
          date?: string;
          start?: string;
          end?: string;
          title?: string;
          attendees?: number;
          note?: string;
        };
        if (!v.roomId || !v.date || !v.start || !v.end || !v.title?.trim()) {
          message.warning('请补全预订信息');
          return false;
        }
        if (v.end <= v.start) {
          message.error('结束时间需晚于开始时间');
          return false;
        }
        const input = {
          roomId: v.roomId,
          date: v.date,
          start: v.start,
          end: v.end,
          title: v.title.trim(),
          attendees: Number(v.attendees ?? 1),
          note: v.note,
          ownerId: session?.user.id ?? 0,
          ownerName: session?.user.nickname ?? '我',
          ownerDept: session ? deptOf(session.user) : undefined,
        };
        const conflict = findConflict(state, input);
        if (conflict) {
          message.error(conflict);
          return false;
        }
        createBooking({ ...input, status: 'confirmed' });
        const target = state.rooms.find((r) => r.id === v.roomId);
        message.success(
          `已预订「${target?.name ?? ''}」${v.date} ${v.start}-${v.end}`,
        );
        onCreated?.();
        onClose();
        return true;
      }}
    >
      <ProFormText
        name="title"
        label="会议主题"
        placeholder="例如：产品周会"
        rules={[{ required: true, message: '请填写会议主题' }]}
      />
      <ProFormSelect
        name="roomId"
        label="会议室"
        placeholder="选择会议室"
        options={roomOptions}
        rules={[{ required: true, message: '请选择会议室' }]}
        fieldProps={{
          showSearch: true,
          optionFilterProp: 'label',
          onChange: (v) => setRoomId(v as string),
        }}
      />
      <ProFormDatePicker
        name="date"
        label="日期"
        rules={[{ required: true, message: '请选择日期' }]}
        fieldProps={{
          allowClear: false,
          disabledDate: (d) => d.isBefore(dayjs().startOf('day')),
        }}
      />
      <ProFormDigit
        name="attendees"
        label={`参会人数${room ? `（上限 ${room.capacity} 人）` : ''}`}
        min={1}
        max={room?.capacity ?? 50}
        rules={[{ required: true, message: '请填写参会人数' }]}
      />
      <ProFormSelect
        name="start"
        label="开始时间"
        options={SLOTS}
        rules={[{ required: true }]}
        fieldProps={{
          showSearch: true,
          onChange: (v) => {
            const idx = SLOTS.indexOf(v as string);
            if (idx >= 0) {
              form.setFieldsValue({
                end: SLOTS[Math.min(idx + 2, SLOTS.length - 1)],
              });
            }
          },
        }}
      />
      <ProFormSelect
        name="end"
        label="结束时间"
        options={SLOTS}
        rules={[{ required: true }]}
        fieldProps={{ showSearch: true }}
      />
      <ProFormTextArea
        name="note"
        label="备注"
        colProps={{ span: 24 }}
        placeholder="选填，如议程、设备要求等"
        fieldProps={{ rows: 2, maxLength: 200 }}
      />
    </ModalForm>
  );
};

export default BookModal;
