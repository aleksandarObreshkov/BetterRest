import {HttpMethod} from "./HttpMethod"

interface Authentication{}

interface ClientCredentialsAuthentication extends Authentication {
    clientId?: string
    clientSecret?: string
    oauthUrl?: string
    token?: string
    scope?: string
}

interface BearerTokenAuthentication extends Authentication {
    token?: string
}

export interface Request {
    url?: string
    method?: HttpMethod
    auth?: Authentication
    headers?: Headers
}