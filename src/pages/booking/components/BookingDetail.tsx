import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  App,
  Button,
  Descriptions,
  Modal,
  Popconfirm,
  Space,
  Tag,
  Typography,
} from 'antd';
import React from 'react';
import {
  type Booking,
  cancelAnyBooking,
  checkInAnyBooking,
  isMine,
  todayStr,
  useMeetState,
} from '@/store/meetStore';

const { Text } = Typography;

interface Props {
  booking: Booking | null;
  userId?: number;
  onClose: () => void;
}

const STATUS_TAG: Record<Booking['status'], React.ReactNode> = {
  confirmed: <Tag color="processing">待进行</Tag>,
  'checked-in': <Tag color="success">已签到</Tag>,
  canceled: <Tag color="default">已取消</Tag>,
};

/** 预订详情：我的预订可签到 / 取消 */
const BookingDetail: React.FC<Props> = ({ booking, userId, onClose }) => {
  const { message } = App.useApp();
  const state = useMeetState();

  if (!booking) return null;
  const room = state.rooms.find((r) => r.id === booking.roomId);
  const mine = isMine(booking, userId);
  const today = booking.date === todayStr();

  return (
    <Modal
      open
      title={
        <Space>
          {booking.title}
          {STATUS_TAG[booking.status]}
        </Space>
      }
      width={520}
      centered
      onCancel={onClose}
      footer={
        mine && booking.status !== 'canceled' ? (
          <Space>
            <Popconfirm
              title="确定取消这个预订吗？"
              okText="取消预订"
              cancelText="再想想"
              onConfirm={() => {
                cancelAnyBooking(booking.id);
                message.success('预订已取消');
                onClose();
              }}
            >
              <Button danger icon={<CloseCircleOutlined />}>
                取消预订
              </Button>
            </Popconfirm>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              disabled={!today || booking.status === 'checked-in'}
              onClick={() => {
                checkInAnyBooking(booking.id);
                message.success('签到成功，祝会议顺利');
                onClose();
              }}
            >
              {booking.status === 'checked-in' ? '已签到' : '签到'}
            </Button>
          </Space>
        ) : (
          <Button onClick={onClose}>关闭</Button>
        )
      }
    >
      <Descriptions
        column={1}
        size="small"
        labelStyle={{ width: 84 }}
        items={[
          {
            key: 'room',
            label: '会议室',
            children: room
              ? `${room.name} · ${room.building} ${room.floor}（${room.capacity} 人）`
              : '已删除',
          },
          {
            key: 'time',
            label: '时间',
            children: (
              <Space>
                <ClockCircleOutlined />
                {booking.date} {booking.start} - {booking.end}
              </Space>
            ),
          },
          {
            key: 'owner',
            label: '组织者',
            children: (
              <Space>
                <UserOutlined />
                {booking.ownerName}
                {booking.ownerDept ? (
                  <Text type="secondary">（{booking.ownerDept}）</Text>
                ) : null}
                {mine ? <Tag color="blue">我的预订</Tag> : null}
              </Space>
            ),
          },
          {
            key: 'attendees',
            label: '参会规模',
            children: (
              <Space>
                <TeamOutlined />
                {booking.attendees} 人
              </Space>
            ),
          },
          {
            key: 'note',
            label: '备注',
            children: booking.note || <Text type="secondary">无</Text>,
          },
        ]}
      />
      {!today && booking.status === 'confirmed' && mine ? (
        <Text type="secondary" style={{ fontSize: 12 }}>
          <ClockCircleOutlined /> 非当日会议，签到将在会议当天开放
        </Text>
      ) : null}
    </Modal>
  );
};

export default BookingDetail;
