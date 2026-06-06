#!/usr/bin/env python3
"""
重置用户密码脚本
用法: python reset_password.py <手机号> <新密码>
"""

import sys
import asyncio
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent))

from app.core.security import hash_password
from app.db.session import engine
from sqlalchemy import select, text
from app.models.user import User


async def reset_password(phone: str, new_password: str):
    """重置用户密码"""
    # 生成密码哈希
    password_hash = hash_password(new_password)
    print(f"生成的密码哈希: {password_hash}")
    
    async with engine.begin() as conn:
        # 更新密码
        result = await conn.execute(
            text("UPDATE users SET password_hash = :hash WHERE phone = :phone"),
            {"hash": password_hash, "phone": phone}
        )
        
        if result.rowcount == 0:
            print(f"错误: 找不到手机号为 {phone} 的用户")
            return False
        else:
            print(f"成功: 手机号 {phone} 的密码已重置")
            return True


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("用法: python reset_password.py <手机号> <新密码>")
        print("示例: python reset_password.py 13646331349 newpass123")
        sys.exit(1)
    
    phone = sys.argv[1]
    new_password = sys.argv[2]
    
    # 密码复杂度检查
    import re
    if not re.match(r"^(?=.*[A-Za-z])(?=.*\d).{6,}$", new_password):
        print("错误: 密码至少6位，且必须包含字母和数字")
        sys.exit(1)
    
    asyncio.run(reset_password(phone, new_password))
