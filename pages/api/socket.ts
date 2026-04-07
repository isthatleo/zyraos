import { NextApiRequest } from 'next'
import { NextApiResponseServerIo, initSocket } from '@/lib/socket-server'

export default function handler(req: NextApiRequest, res: NextApiResponseServerIo) {
  if (req.method !== 'GET') {
    res.status(405).json({ message: 'Method not allowed' })
    return
  }

  initSocket(res)
  res.end()
}

export const config = {
  api: {
    bodyParser: false,
  },
}
