curl http://localhost:20042/action -X POST -d "{""character"":2,""sender"":0,""voice"":""Hello World"",""subtitle"":""Hello World""}"
pause
curl http://localhost:20042/action -X POST -d "{""character"":1,""sender"":0,""voice"":""I have a pen, I have an apple, apple pen"",""subtitle"":""I have a pen, I have an apple, apple pen""}"
pause
curl http://localhost:20042/action -X POST -d "{""character"":0,""sender"":0,""voice"":""\u304D\u308A\u305F\u3093\u3001\u3078\u3053\u3078\u3053\u3001\u6C17\u6301\u3061\u3088\u3059\u304E\u3060\u308D"",""subtitle"":""\u304D\u308A\u305F\u3093\u3001\u3078\u3053\u3078\u3053\u3001\u6C17\u6301\u3061\u3088\u3059\u304E\u3060\u308D""}"
pause
curl http://localhost:20042/action -X POST -d "{""character"":2,""sender"":0,""voice"":""\u6EDA\u554A"",""subtitle"":""\u6EDA\u554A""}"
pause
curl http://localhost:20042/action -X POST -d "{""character"":2,""sender"":0,""voice"":""[\u8F6C\u5411]"",""subtitle"":""[\u8F6C\u5411]""}"
