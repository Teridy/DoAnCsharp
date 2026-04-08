import { useEffect, useState } from "react";
import styles from "../css/UserManager.module.css";

// ===== Icons =====
const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const UnlockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0 1 9.2-1"/>
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const ViewIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

// ===== Component =====
function UserManager() {

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const token = sessionStorage.getItem("token");
  const [showAddModal, setShowAddModal] = useState(false);

const [newUser, setNewUser] = useState({
  userName: "",
  email: "",
  phone: "",
  userRole: "Seller",
  hashPass: "",
  status: "Active"
});
  // ===== Load users =====
  const loadUsers = () => {
    fetch("http://localhost:5050/api/User",{
      headers:{
        Authorization:"Bearer " + token
      }
    })
      .then(res => res.json())
      .then(data => setUsers(data))
      .catch(()=>console.log("Lỗi tải users"));
  };

  // ===== Save user =====
  const updateUser = async () => {

    await fetch(`http://localhost:5050/api/User/${selectedUser.userName}`,{
      method:"PUT",
      headers:{
        "Content-Type":"application/json",
        Authorization:"Bearer " + token
      },
      body:JSON.stringify(selectedUser)
    });

    loadUsers();
    setSelectedUser(null);
  };

  // ===== Lock / Unlock (CHỈ ĐỔI STATE) =====
  const lockUser = () => {
    setSelectedUser({...selectedUser,status:"Locked"});
  };

  const unlockUser = () => {
    setSelectedUser({...selectedUser,status:"Active"});
  };
const addUser = async () => {

  await fetch("http://localhost:5050/api/User",{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      Authorization:"Bearer " + token
    },
    body:JSON.stringify(newUser)
  });

  setShowAddModal(false);

  setNewUser({
    UserName:"",
    Email:"",
    Phone:"",
    UserRole:"Seller",
    HashPass:"",
    Status:"Active"
  });

  loadUsers();
};
  useEffect(()=>{
    loadUsers();
  },[]);

 return (
  <div className={styles["user-container"]}>

    <div className={styles["user-header"]}>
      <h1>👥 Quản lý người dùng</h1>

      <button
        className={styles["add-btn"]}
        onClick={()=>setShowAddModal(true)}
      >
        + Thêm user
      </button>
    </div>

    <table className={styles["user-table"]}>
      <thead>
        <tr>
          <th>Tên người dùng</th>
          <th>Vai trò</th>
          <th>Email</th>
          <th>Số điện thoại</th>
          <th>Trạng thái</th>
          <th>Thao tác</th>
        </tr>
      </thead>

      <tbody>
        {users.map((u)=>(
          <tr key={u.userName}>
            <td>{u.userName}</td>
            <td>{u.userRole}</td>
            <td>{u.email}</td>
            <td>{u.phone}</td>

            <td>
              <div className={
                u.status === "Active"
                ? styles["status-active"]
                : styles["status-lock"]
              }>
                {u.status}
              </div>
            </td>

            <td>
              <button
                className={styles["view-btn"]}
                onClick={()=>setSelectedUser({...u})}
              >
                <ViewIcon/>
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>

    {/* ADD MODAL */}
    {showAddModal && (
      <div className={styles.modal}>
        <div className={styles["modal-box"]}>

          <div className={styles["modal-header"]}>
            <h2>Thêm User</h2>
            <button
              className={styles["modal-close-icon"]}
              onClick={()=>setShowAddModal(false)}
            >
              <CloseIcon/>
            </button>
          </div>

          <div className={styles["modal-content"]}>

            <div className={styles["form-group"]}>
              <label>Username</label>
              <input
                value={newUser.userName}
                onChange={(e)=>setNewUser({...newUser,userName:e.target.value})}
              />
            </div>

            <div className={styles["form-group"]}>
              <label>Email</label>
              <input
                value={newUser.email}
                onChange={(e)=>setNewUser({...newUser,email:e.target.value})}
              />
            </div>

            <div className={styles["form-group"]}>
              <label>Phone</label>
              <input
                value={newUser.phone}
                onChange={(e)=>setNewUser({...newUser,phone:e.target.value})}
              />
            </div>

            <div className={styles["form-group"]}>
              <label>Password</label>
              <input
                type="password"
                value={newUser.hashPass}
                onChange={(e)=>setNewUser({...newUser,hashPass:e.target.value})}
              />
            </div>

            <div className={styles["form-group"]}>
              <label>Role</label>
              <select
                value={newUser.userRole}
                onChange={(e)=>setNewUser({...newUser,userRole:e.target.value})}
              >
                <option value="Admin">Admin</option>
                <option value="Seller">Seller</option>
              </select>
            </div>

          </div>

          <div className={styles["modal-actions"]}>
            <button
              className={`${styles["icon-btn"]} ${styles["save-btn"]}`}
              onClick={addUser}
            >
              <i className="fa-solid fa-floppy-disk"></i>
            </button>
          </div>

        </div>
      </div>
    )}

    {/* DETAIL MODAL */}
    {selectedUser && (
      <div className={styles.modal}>
        <div className={styles["modal-box"]}>

          <div className={styles["modal-header"]}>
            <h2>User Detail</h2>
            <button
              className={styles["modal-close-icon"]}
              onClick={()=>setSelectedUser(null)}
            >
              <CloseIcon/>
            </button>
          </div>

          <div className={styles["modal-content"]}>

            <div className={styles["form-group"]}>
              <label>Username</label>
              <input value={selectedUser.userName} disabled/>
            </div>

            <div className={styles["form-group"]}>
              <label>Email</label>
              <input
                value={selectedUser.email}
                onChange={(e)=>setSelectedUser({...selectedUser,email:e.target.value})}
              />
            </div>

            <div className={styles["form-group"]}>
              <label>Phone</label>
              <input
                value={selectedUser.phone}
                onChange={(e)=>setSelectedUser({...selectedUser,phone:e.target.value})}
              />
            </div>

            <div className={styles["form-group"]}>
              <label>Role</label>
              <select
                value={selectedUser.userRole}
                onChange={(e)=>setSelectedUser({...selectedUser,userRole:e.target.value})}
              >
                <option value="Admin">Admin</option>
                <option value="Seller">Seller</option>
              </select>
            </div>

            <div className={styles["form-group"]}>
              <label>Status</label>
              <div className={
                selectedUser.status === "Active"
                ? styles["status-active"]
                : styles["status-lock"]
              }>
                {selectedUser.status}
              </div>
            </div>

          </div>

          <div className={styles["modal-actions"]}>

            <button
              className={`${styles["icon-btn"]} ${styles["save-btn"]}`}
              onClick={updateUser}
            >
              <i className="fa-solid fa-floppy-disk"></i>
            </button>

            {selectedUser.status === "Active" ? (
              <button
                className={`${styles["icon-btn"]} ${styles["lock-btn"]}`}
                onClick={lockUser}
              >
                <LockIcon/>
              </button>
            ) : (
              <button
                className={`${styles["icon-btn"]} ${styles["unlock-btn"]}`}
                onClick={unlockUser}
              >
                <UnlockIcon/>
              </button>
            )}

          </div>

        </div>
      </div>
    )}

  </div>
);
}

export default UserManager;