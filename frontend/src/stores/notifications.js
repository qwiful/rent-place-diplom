import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api'

export const useNotificationsStore = defineStore('notifications', () => {
  const items = ref([])
  const unreadCount = ref(0)

  const fetch = async () => {
    try {
      const { data } = await api.get('/notifications')
      items.value = data.notifications
      unreadCount.value = items.value.filter(
        (n) => n.status === 'unread',
      ).length
    } catch (err) {
      console.error(err)
    }
  }

  const markAsRead = async (ids) => {
    await api.patch('/notifications/mark-read', { ids })
    await fetch()
  }

  const markAllRead = async () => {
    const unreadIds = items.value
      .filter((n) => n.status === 'unread')
      .map((n) => n.id)
    if (unreadIds.length) await markAsRead(unreadIds)
  }

  return { items, unreadCount, fetch, markAsRead, markAllRead }
})
