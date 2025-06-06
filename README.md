This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# WedShoot - Wedding Photography Platform

## Fitur Realtime Chat 🚀

Fitur realtime telah diaktifkan untuk aplikasi chat WedShoot menggunakan Supabase Realtime.

### ✅ Yang Sudah Dikonfigurasi:

1. **Supabase Realtime Client Setup**

   - Konfigurasi realtime parameters di `src/lib/supabase.ts`
   - Helper functions untuk subscribe/unsubscribe channels
   - Debug utilities untuk monitoring koneksi

2. **Database Configuration**

   - Tabel `messages` dan `chat_rooms` sudah ditambahkan ke publikasi realtime
   - RLS policies sudah dikonfigurasi dengan benar
   - RPC function `increment_unread_count` untuk update counter

3. **Frontend Integration**
   - Hook `useChat` sudah terintegrasi dengan realtime
   - Auto-update messages tanpa refresh halaman
   - Realtime status indicator di UI
   - Auto mark as read untuk messages baru

### 🔧 Fitur Realtime:

#### Di Halaman Chat List (`/chat`):

- ✅ Status indicator realtime connection
- ✅ Auto-update chat rooms list ketika ada perubahan
- ✅ Real-time unread count updates

#### Di Halaman Chat Room (`/chat/[roomId]`):

- ✅ Real-time message delivery
- ✅ Status indicator online/offline
- ✅ Auto-scroll ke message terbaru
- ✅ Auto mark messages as read
- ✅ Optimistic UI updates untuk pengalaman yang responsif

### 🛠️ Technical Implementation:

1. **Helper Functions** (`src/lib/supabase.ts`):

   ```typescript
   subscribeToMessages(roomId, onMessage, onError);
   subscribeToChatRooms(userId, onRoomUpdate, onError);
   unsubscribeAll();
   debugRealtimeStatus();
   ```

2. **Database Functions**:

   ```sql
   increment_unread_count(room_id, field_name, last_msg_at, last_msg_preview)
   ```

3. **UI Components**:
   - Realtime connection indicator
   - Auto-updating message list
   - Typing indicators (ready for implementation)

### 🚀 Testing Realtime:

1. Buka 2 browser/tab berbeda
2. Login sebagai user yang berbeda
3. Start chat antara client dan vendor
4. Kirim message dari satu tab
5. Message akan muncul real-time di tab lainnya
6. Perhatikan status indicator menunjukkan "Realtime Aktif"

### 🔍 Debug Mode:

Dalam development mode, tersedia tombol debug untuk:

- Monitor realtime connection status
- Test message delivery
- View active channels
- Storage debugging

### 📱 Mobile Compatibility:

Realtime sudah dikonfigurasi untuk bekerja optimal di:

- ✅ Desktop browsers
- ✅ Mobile browsers
- ✅ PWA mode
- ✅ Background tab handling

### ⚡ Performance:

- Rate limiting: 2 events per second
- Heartbeat interval: 30 detik
- Auto-reconnect pada connection loss
- Efficient channel management untuk mencegah memory leaks

### 🔒 Security:

- RLS policies memastikan user hanya menerima messages dari room mereka
- Authentication required untuk semua realtime subscriptions
- Secure storage untuk auth tokens

---

**Status**: ✅ **REALTIME SUDAH AKTIF DAN SIAP DIGUNAKAN**
