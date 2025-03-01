import { 
    auth, 
    GoogleAuthProvider, 
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    updateProfile,
    db, 
    collection, 
    addDoc, 
    onSnapshot, 
    doc, 
    updateDoc, 
    arrayUnion, 
    increment,
    setDoc,
    deleteDoc
} from "./firebase.js";
import { query, orderBy, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Add after existing imports
let currentUser = null;

// Global event handlers
let initialized = false;

// เพิ่มตัวแปร global สำหรับจัดการ listener
let feedUnsubscribe = null;

// Main initialization function
const initializeApp = () => {
    if (initialized) return;
    initialized = true;

    // Check internet connection
    if (!navigator.onLine) {
        Swal.fire({
            icon: 'error',
            title: 'ไม่มีการเชื่อมต่อ',
            text: 'กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต',
            confirmButtonText: 'ตกลง'
        });
        return;
    }

    // Setup event listeners
    setupAuthButtons();
    setupCreatePost();
    listenToAuthChanges();
    setupFeed();
};

// Setup auth buttons
const setupAuthButtons = () => {
    const googleLoginBtn = document.getElementById('googleLogin');
    const emailLoginBtn = document.getElementById('emailLogin');
    const registerBtn = document.getElementById('registerBtn');

    if (googleLoginBtn) {
        googleLoginBtn.onclick = async () => {
            try {
                const provider = new GoogleAuthProvider();
                provider.addScope('profile');
                provider.addScope('email');
                const result = await signInWithPopup(auth, provider);
                
                // อัพเดทข้อมูลผู้ใช้ในฐานข้อมูล
                const userRef = doc(db, 'users', result.user.uid);
                await setDoc(userRef, {
                    displayName: result.user.displayName,
                    email: result.user.email,
                    photoURL: result.user.photoURL,
                    lastLogin: new Date().toISOString(),
                    provider: 'google'
                }, { merge: true });

                console.log('Google login successful:', result.user);
            } catch (error) {
                console.error('Google login error:', error);
                await Swal.fire({
                    icon: 'error',
                    title: 'เข้าสู่ระบบไม่สำเร็จ',
                    text: error.message,
                    confirmButtonText: 'ตกลง'
                });
            }
        };
    }

    if (emailLoginBtn) {
        emailLoginBtn.onclick = handleEmailLogin;
    }

    if (registerBtn) {
        registerBtn.onclick = handleRegistration;
    }
};

// Handle email login
const handleEmailLogin = async () => {
    try {
        const { value: formValues } = await Swal.fire({
            title: 'เข้าสู่ระบบด้วยอีเมล',
            html: `
                <input id="swal-input1" class="swal2-input" placeholder="อีเมล">
                <input id="swal-input2" class="swal2-input" type="password" placeholder="รหัสผ่าน">
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'เข้าสู่ระบบ',
            cancelButtonText: 'ยกเลิก',
            preConfirm: () => ({
                email: document.getElementById('swal-input1').value,
                password: document.getElementById('swal-input2').value
            })
        });

        if (!formValues) return;

        const result = await signInWithEmailAndPassword(
            auth,
            formValues.email,
            formValues.password
        );
        console.log('Email login successful:', result.user);
    } catch (error) {
        console.error('Email login error:', error);
        await Swal.fire({
            icon: 'error',
            title: 'เข้าสู่ระบบไม่สำเร็จ',
            text: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
            confirmButtonText: 'ตกลง'
        });
    }
};

// Handle registration
const handleRegistration = async () => {
    try {
        const { value: formValues } = await Swal.fire({
            title: 'สมัครสมาชิก',
            html: `
                <input id="swal-input1" class="swal2-input" placeholder="ชื่อที่แสดง">
                <input id="swal-input2" class="swal2-input" type="email" placeholder="อีเมล">
                <input id="swal-input3" class="swal2-input" type="password" placeholder="รหัสผ่าน">
                <input id="swal-input4" class="swal2-input" type="password" placeholder="ยืนยันรหัสผ่าน">
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'สมัครสมาชิก',
            cancelButtonText: 'ยกเลิก',
            preConfirm: () => {
                const displayName = document.getElementById('swal-input1').value;
                const email = document.getElementById('swal-input2').value;
                const password = document.getElementById('swal-input3').value;
                const confirmPassword = document.getElementById('swal-input4').value;

                if (!displayName || !email || !password || !confirmPassword) {
                    Swal.showValidationMessage('กรุณากรอกข้อมูลให้ครบทุกช่อง');
                    return false;
                }
                if (password !== confirmPassword) {
                    Swal.showValidationMessage('รหัสผ่านไม่ตรงกัน');
                    return false;
                }
                if (password.length < 6) {
                    Swal.showValidationMessage('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
                    return false;
                }
                if (!email.includes('@')) {
                    Swal.showValidationMessage('รูปแบบอีเมลไม่ถูกต้อง');
                    return false;
                }

                return { displayName, email, password };
            }
        });

        if (!formValues) return;

        const userCredential = await createUserWithEmailAndPassword(
            auth, 
            formValues.email, 
            formValues.password
        );

        await updateProfile(userCredential.user, {
            displayName: formValues.displayName
        });

        await Swal.fire({
            icon: 'success',
            title: 'สมัครสมาชิกสำเร็จ',
            text: 'ยินดีต้อนรับสู่ SuperX Chat & Feed',
            confirmButtonText: 'เริ่มต้นใช้งาน'
        });
    } catch (error) {
        console.error('Registration error:', error);
        await Swal.fire({
            icon: 'error',
            title: 'ไม่สามารถสมัครสมาชิกได้',
            text: error.message,
            confirmButtonText: 'ตกลง'
        });
    }
};

// Setup post creation
const setupCreatePost = () => {
    const createPostBtn = document.getElementById('createPost');
    if (createPostBtn) {
        createPostBtn.onclick = async () => {
            try {
                const text = document.getElementById('postInput').value.trim();
                if (!text) {
                    await Swal.fire({
                        icon: 'warning',
                        title: 'ไม่สามารถโพสต์ได้',
                        text: 'กรุณาเขียนข้อความก่อนโพสต์',
                        confirmButtonText: 'ตกลง'
                    });
                    return;
                }

                const hashtags = text.match(/#\w+/g) || [];
                await addDoc(collection(db, "posts"), {
                    text,
                    authorId: auth.currentUser.uid,
                    authorName: auth.currentUser.displayName || auth.currentUser.email,
                    authorPhoto: auth.currentUser.photoURL || 'https://via.placeholder.com/40',
                    createdAt: new Date().toISOString(),
                    likes: 0,
                    hashtags
                });

                document.getElementById('postInput').value = '';
                await Swal.fire({
                    icon: 'success',
                    title: 'โพสต์สำเร็จ',
                    showConfirmButton: false,
                    timer: 1500
                });
            } catch (error) {
                console.error('Create post error:', error);
                await Swal.fire({
                    icon: 'error',
                    title: 'ไม่สามารถโพสต์ได้',
                    text: error.message,
                    confirmButtonText: 'ตกลง'
                });
            }
        };
    }
};

// Profile Management
const setupProfile = async (user) => {
    try {
        const userProfile = document.getElementById('userProfile');
        
        // ดึงข้อมูลผู้ใช้จาก Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data() || {};

        // สร้าง HTML สำหรับโปรไฟล์
        userProfile.innerHTML = `
            <div class="flex items-center gap-4 bg-gray-800/50 backdrop-blur-sm p-4 rounded-xl border border-gray-700">
                <img src="${userData.photoURL || user.photoURL || 'https://via.placeholder.com/100'}" 
                     alt="Profile" 
                     class="w-12 h-12 rounded-full border-2 border-blue-500">
                <div class="flex-grow">
                    <div class="font-medium text-white">${userData.displayName || user.displayName || user.email}</div>
                    <div class="text-sm text-gray-400">${user.email}</div>
                </div>
                <button id="editProfileBtn" class="text-gray-400 hover:text-blue-500 p-2 rounded-lg transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                </button>
                <button id="logoutBtn" class="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors">
                    ออกจากระบบ
                </button>
            </div>
        `;

        // เพิ่ม event listeners
        document.getElementById('editProfileBtn').onclick = handleEditProfile;
        document.getElementById('logoutBtn').onclick = async () => {
            try {
                await signOut(auth);
                await Swal.fire({
                    icon: 'success',
                    title: 'ออกจากระบบสำเร็จ',
                    showConfirmButton: false,
                    timer: 1500
                });
            } catch (error) {
                console.error('Logout error:', error);
            }
        };

    } catch (error) {
        console.error('Profile setup error:', error);
        await Swal.fire({
            icon: 'error',
            title: 'ไม่สามารถโหลดข้อมูลโปรไฟล์',
            text: 'กรุณาลองใหม่อีกครั้ง',
            confirmButtonText: 'ตกลง'
        });
    }
};

const handleEditProfile = async () => {
    try {
        const { value: formValues } = await Swal.fire({
            title: 'แก้ไขโปรไฟล์',
            html: `
                <input id="swal-input1" class="swal2-input" placeholder="ชื่อที่แสดง" 
                    value="${currentUser.displayName || ''}">
                <input id="swal-input2" class="swal2-input" placeholder="URL รูปโปรไฟล์" 
                    value="${currentUser.photoURL || ''}">
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'บันทึก',
            cancelButtonText: 'ยกเลิก',
            preConfirm: () => ({
                displayName: document.getElementById('swal-input1').value,
                photoURL: document.getElementById('swal-input2').value
            })
        });

        if (!formValues) return;

        await updateProfile(currentUser, formValues);
        await setupProfile(currentUser);

        await Swal.fire({
            icon: 'success',
            title: 'อัพเดทโปรไฟล์สำเร็จ',
            showConfirmButton: false,
            timer: 1500
        });
    } catch (error) {
        console.error('Edit profile error:', error);
        await Swal.fire({
            icon: 'error',
            title: 'ไม่สามารถแก้ไขโปรไฟล์ได้',
            text: error.message,
            confirmButtonText: 'ตกลง'
        });
    }
};

// Friend System
const setupFriendSystem = () => {
    document.getElementById('closeFriendsSidebar').onclick = () => {
        document.getElementById('friendsSidebar').classList.add('translate-x-full');
    };

    listenToFriendRequests(currentUser.uid);
    loadFriendsList(currentUser.uid);
};

const listenToFriendRequests = (userId) => {
    onSnapshot(collection(db, `users/${userId}/friendRequests`), async (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
            if (change.type === 'added') {
                const request = change.doc.data();
                await Swal.fire({
                    title: 'คำขอเป็นเพื่อน',
                    text: `${request.senderName} ต้องการเป็นเพื่อนกับคุณ`,
                    showCancelButton: true,
                    confirmButtonText: 'ยอมรับ',
                    cancelButtonText: 'ปฏิเสธ'
                }).then(async (result) => {
                    if (result.isConfirmed) {
                        await handleFriendAccept(userId, request.senderId);
                    } else {
                        await handleFriendReject(userId, request.senderId);
                    }
                });
            }
        });
    });
};

// Add friend functions
const handleAddFriend = async (friendId) => {
    try {
        const friendRef = doc(db, 'users', friendId);
        await setDoc(doc(db, `users/${friendId}/friendRequests`, currentUser.uid), {
            senderId: currentUser.uid,
            senderName: currentUser.displayName || currentUser.email,
            senderPhoto: currentUser.photoURL,
            status: 'pending',
            timestamp: new Date().toISOString()
        });

        await Swal.fire({
            icon: 'success',
            title: 'ส่งคำขอเป็นเพื่อนแล้ว',
            showConfirmButton: false,
            timer: 1500
        });
    } catch (error) {
        console.error('Add friend error:', error);
        await Swal.fire({
            icon: 'error',
            title: 'ไม่สามารถส่งคำขอเป็นเพื่อนได้',
            text: error.message,
            confirmButtonText: 'ตกลง'
        });
    }
};

// Auth state observer
const listenToAuthChanges = () => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            const loginSection = document.getElementById('loginSection');
            const userContent = document.getElementById('userContent');
            const userProfile = document.getElementById('userProfile');

            loginSection.classList.add('hidden');
            userContent.classList.remove('hidden');
            userProfile.innerHTML = `
                <img src="${user.photoURL || 'https://via.placeholder.com/40'}" 
                     alt="Profile" 
                     class="w-10 h-10 rounded-full">
                <span>${user.displayName || user.email}</span>
                <button id="logoutBtn" class="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600">
                    ออกจากระบบ
                </button>
            `;

            document.getElementById('logoutBtn').addEventListener('click', async () => {
                try {
                    await signOut(auth);
                    await Swal.fire({
                        icon: 'success',
                        title: 'ออกจากระบบสำเร็จ',
                        showConfirmButton: false,
                        timer: 1500
                    });
                } catch (error) {
                    console.error('Logout error:', error);
                }
            });

            await setupProfile(user);
            setupFriendSystem();
            setupFeed();
        } else {
            currentUser = null;
            const loginSection = document.getElementById('loginSection');
            const userContent = document.getElementById('userContent');
            const userProfile = document.getElementById('userProfile');

            loginSection.classList.remove('hidden');
            userContent.classList.add('hidden');
            userProfile.innerHTML = '';

            if (feedUnsubscribe) {
                feedUnsubscribe();
                feedUnsubscribe = null;
            }
        }
    });
};

// Setup feed
const setupFeed = () => {
    try {
        // ยกเลิก listener เก่าถ้ามี
        if (feedUnsubscribe) {
            feedUnsubscribe();
        }

        const feedElement = document.getElementById('feed');
        if (!feedElement) {
            console.error('Feed element not found');
            return;
        }

        // สร้าง query
        const feedQuery = query(
            collection(db, "posts"),
            orderBy("createdAt", "desc")
        );

        // ตั้งค่า listener ใหม่
        feedUnsubscribe = onSnapshot(feedQuery, 
            (snapshot) => {
                feedElement.innerHTML = "";
                snapshot.forEach(doc => {
                    const post = doc.data();
                    const postElement = createPostElement(post, doc.id);
                    feedElement.appendChild(postElement);
                });
            },
            (error) => {
                console.error("Feed error:", error);
                Swal.fire({
                    icon: 'error',
                    title: 'ไม่สามารถโหลดฟีดได้',
                    text: 'กรุณารีเฟรชหน้าเว็บ',
                    confirmButtonText: 'ตกลง'
                });
            }
        );
    } catch (error) {
        console.error("Setup feed error:", error);
    }
};

const createPostElement = (post, postId) => {
    const div = document.createElement('div');
    div.id = `post-${postId}`;
    div.className = 'bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700 mb-4';

    const timestamp = new Date(post.createdAt).toLocaleString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    div.innerHTML = `
        <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
                <img src="${post.authorPhoto || 'https://via.placeholder.com/40'}" 
                     alt="Profile" 
                     class="w-10 h-10 rounded-full">
                <div>
                    <div class="font-medium text-white">${post.authorName}</div>
                    <div class="text-sm text-gray-400">${timestamp}</div>
                </div>
            </div>
            ${post.authorId === auth.currentUser?.uid ? `
                <button onclick="deletePost('${postId}')" 
                    class="text-gray-400 hover:text-red-500 transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            ` : ''}
        </div>
        <p class="text-white mb-4">${post.text}</p>
        <div class="flex justify-between items-center">
            <div class="flex gap-4">
                <button onclick="likePost('${postId}')" class="text-gray-400 hover:text-blue-500">
                    <span>${post.likes || 0}</span> ถูกใจ
                </button>
                <button onclick="commentPost('${postId}')" class="text-gray-400 hover:text-blue-500">
                    <span>${post.comments?.length || 0}</span> ความคิดเห็น
                </button>
            </div>
        </div>
    `;

    return div;
};

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', initializeApp);