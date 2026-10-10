Start-Process powershell -ArgumentList '-NoExit', '-Command', 'Set-Location "A:\PycharmProjects\battery-project\backend"; py -m uvicorn app.main:app --reload'

Start-Process powershell -ArgumentList '-NoExit', '-Command', 'Set-Location "A:\PycharmProjects\battery-project\frontend"; npm run dev'
