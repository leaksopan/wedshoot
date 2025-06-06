# WedShoot - Troubleshooting Guide

## Masalah Session "snapme_user_session"

### Gejala

- Session di browser menunjukkan nama "snapme_user_session" bukan "wedshoot-auth-token"
- Redirect ke login page terus menerus
- Auth state tidak stabil

### Penyebab

Browser masih menyimpan session dari project Supabase lama (snapme) yang conflict dengan project WedShoot.

### Solusi

#### 1. Reset Otomatis (Recommended)

Aplikasi sudah otomatis clear session snapme lama, tapi jika masih bermasalah:

1. Buka halaman `/chat`
2. Jika development mode, klik tombol **"Reset"** di header
3. Konfirmasi reset browser data
4. Aplikasi akan reload dan menggunakan session WedShoot yang benar

#### 2. Manual Browser Reset

1. Buka Developer Tools (F12)
2. Pergi ke tab **Application** (Chrome) atau **Storage** (Firefox)
3. Di bagian Storage, hapus semua:
   - Local Storage items yang mengandung "snapme" atau "supabase"
   - Session Storage items yang mengandung "snapme" atau "supabase"
   - Cookies domain localhost/wedshoot
4. Reload halaman

#### 3. Hard Reset (Nuclear Option)

```javascript
// Jalankan di browser console
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Verifikasi Fix

Setelah reset, session yang benar harus menunjukkan:

- Storage key: `wedshoot-auth-token`
- URL: `https://rufdjysbrykvrtxyqxtg.supabase.co`
- Project ref: `rufdjysbrykvrtxyqxtg` (bukan snapme)

### Debug Commands (Development Only)

```javascript
// Lihat semua storage keys
debugStorageKeys();

// Clear snapme sessions manual
clearSnapmeSessions();

// Reset aplikasi complete
resetApplication();
```

## Masalah Chat Redirect Loop

### Gejala

- Halaman chat redirect ke login berulang-ulang
- Loading auth state tidak selesai

### Solusi

1. Pastikan sudah clear session snapme (lihat di atas)
2. Check auth loading state - tunggu sampai selesai sebelum redirect
3. Jika masih bermasalah, logout dan login ulang dengan user yang valid

## Masalah Error 400 pada Chat Messages

### Gejala

- Error "400 (Bad Request)" saat loading messages
- Halaman chat tidak menampilkan pesan
- Query Supabase gagal dengan error kompleks

### Penyebab

Query messages menggunakan nested relationship yang terlalu kompleks:

```
// Query bermasalah
sender:user_profiles!messages_sender_id_fkey(
  id, full_name, avatar_url
),
reply_to:messages!messages_reply_to_message_id_fkey(
  // nested relationship
)
```

### Solusi yang Diterapkan

1. **Simplified Query**: Pisahkan query menjadi beberapa bagian sederhana
2. **Sequential Loading**: Load messages basic dulu, lalu load sender info terpisah
3. **Better Error Handling**: Tambahkan fallback jika query gagal

### Kode Perbaikan

```typescript
// Di useChat.ts - loadMessages()
// 1. Load basic message data
const { data: messageData } = await supabase
  .from("messages")
  .select("id, room_id, sender_id, content, ...")
  .eq("room_id", roomId);

// 2. Load sender info separately
const messagesWithSender = await Promise.all(
  messageData.map(async (message) => {
    const { data: senderData } = await supabase
      .from("user_profiles")
      .select("id, full_name, avatar_url")
      .eq("id", message.sender_id)
      .single();

    return { ...message, sender: senderData };
  })
);
```

### Testing

Untuk verify perbaikan berhasil:

1. Buka chat room yang sebelumnya error
2. Messages harus load tanpa error 400
3. Sender names dan avatars muncul dengan benar

## Browser Storage Debug

### Development Tools

Jika masih ada masalah di development:

1. **Debug Button**: Klik "Debug" di halaman `/chat` untuk lihat session info
2. **Storage Button**: Klik "Storage" untuk lihat semua browser storage keys
3. **Reset Button**: Hard reset semua browser data

### Manual Check

```javascript
// Check di Console Browser
console.log("Local Storage:", { ...localStorage });
console.log("Session Storage:", { ...sessionStorage });

// Clear manual if needed
localStorage.clear();
sessionStorage.clear();
```

## Masalah Realtime Chat Messages

### Gejala

- Pesan baru tidak muncul langsung setelah dikirim
- Harus refresh browser untuk melihat pesan
- Chat tidak sinkron real-time

### Penyebab

1. **Realtime subscription tidak berjalan dengan benar**
2. **Filter realtime tidak sesuai dengan room_id**
3. **Connection WebSocket terputus**

### Solusi yang Diterapkan

#### 1. Enhanced Realtime Subscription

```typescript
// Di useChat.ts - Setup per room subscription
const messagesSubscription = supabase
  .channel(`messages_room_${currentRoomId}`)
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "messages",
      filter: `room_id=eq.${currentRoomId}`,
    },
    async (payload) => {
      // Handle new message realtime
      const newMessage = payload.new;
      const senderData = await loadSenderInfo(newMessage.sender_id);

      setMessages((prev) => [...prev, { ...newMessage, sender: senderData }]);
    }
  )
  .subscribe();
```

#### 2. Optimistic Updates

```typescript
// Di sendMessage - Tambahkan pesan langsung ke UI
if (data) {
  setMessages((prevMessages) => {
    const exists = prevMessages.some((msg) => msg.id === data.id);
    if (!exists) {
      return [...prevMessages, messageWithSender];
    }
    return prevMessages;
  });
}
```

#### 3. Duplicate Prevention

- Check message ID sebelum menambah ke state
- Avoid duplicate dari optimistic update + realtime

### Testing Realtime

#### Development Debug Tools

Di halaman chat room (development mode):

1. **"Debug RT"** - Check connection status dan test basic realtime
2. **"Test RT"** - Insert dummy message untuk test realtime

#### Manual Testing

```javascript
// Di Console Browser
import { debugRealtimeConnection } from "@/utils/debugRealtime";

const debug = debugRealtimeConnection();
debug.checkConnectionStatus();
debug.testBasicConnection();
```

#### Database Testing

```sql
-- Insert manual message untuk test realtime
INSERT INTO messages (room_id, sender_id, content, message_type)
VALUES ('room-id', 'user-id', 'Test realtime', 'text');
```

### Verifikasi Perbaikan

1. ✅ Kirim pesan → Muncul langsung tanpa refresh
2. ✅ Pesan dari user lain → Muncul real-time
3. ✅ No duplicates → Message hanya muncul sekali
4. ✅ Connection stable → WebSocket tetap terhubung

## Debugging Tips

### Development Mode

- Use debug panel di halaman chat untuk melihat auth state
- Check browser console untuk log session debug
- Monitor network tab untuk request Supabase

### Production

- Check Supabase dashboard untuk active sessions
- Monitor error logs untuk auth issues
- Pastikan environment variables benar

---

**Note**: File ini akan terus diupdate seiring development aplikasi.
