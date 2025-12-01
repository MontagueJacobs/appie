# AH API

Always use `User-Agent: Appie/8.22.3` and `Content-Type: application/json`  
Technically there is more information about your device and user ID after it, but the server does not seem to care

## Token

If you have a valid `access_token`, add it as a header in request  
`Authorization: Bearer access_token`

### Get token

#### Anonymous token

Get a token:  
`POST https://api.ah.nl/mobile-auth/v1/auth/token/anonymous`  
```json
{
  "clientId": "appie"
}
```

Returns:  
```json
{
  "access_token": "USERID_ACCESSTOKEN",
  "refresh_token": "REFRESHTOKEN",
  "expires_in": 7199
}
```

#### User specific token

Sign in via browser (set `User-Agent`)  
Visit https://login.ah.nl/secure/oauth/authorize?client_id=appie&redirect_uri=appie://login-exit&response_type=code  
Login, page should reply with `303 See Other` and something like `Location: appie://login-exit?code=CODE`

Take `CODE` and


`POST https://api.ah.nl/mobile-auth/v1/auth/token`  
```json
{
  "clientId": "appie",
  "code": "CODE"
}
```

Returns:  
```json
{
  "access_token": "USERID_ACCESSTOKEN",
  "refresh_token": "REFRESHTOKEN",
  "expires_in": 7199
}
```

### Refresh token

`POST https://api.ah.nl/mobile-auth/v1/auth/token/refresh`  
```json
{
  "clientId": "appie",
  "refreshToken": "REFRESHTOKEN"
}
```

Returns:  
```json
{
  "access_token": "USERID_ACCESSTOKEN",
  "refresh_token": "REFRESHTOKEN",
  "expires_in": 7199
}
```

## Find products

`GET https://api.ah.nl/mobile-services/product/search/v2?query=QUERY&sortOn=RELEVANCE`  
See reply example in `search.json`

## Get receipts (signed in)

`GET https://api.ah.nl/mobile-services/v1/receipts`  
See reply example in `receipts.json`

## Get specific receipt (signed in)

`GET https://api.ah.nl/mobile-services/v2/receipts/TRANSACTIONID`  
See reply example in `receipt.json`

If you want to use this to crossmatch transactions from your bank statement, look for the text in `"first": "Authorization code"` (and for old receipts it's `"third":"Autorisatiecode"`)

