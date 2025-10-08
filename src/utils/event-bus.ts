import mitt from 'mitt'

type Events = {
  newLogAdded: void
}

export const eventBus = mitt<Events>()
