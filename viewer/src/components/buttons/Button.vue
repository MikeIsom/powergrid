<template>
    <g :class="['button', { enabled }]" @click="enabled && $emit('click')">
        <rect :width="width" height="30" fill="#e9edf2" stroke="#1f2a36" rx="5" />
        <text text-anchor="middle" fill="black" :x="width / 2" y="16">{{ getText() }}</text>
        <title>{{ text }}</title>
    </g>
</template>
<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator';

@Component
export default class Button extends Vue {
    @Prop()
    text?: string;

    @Prop()
    width?: number;

    @Prop({ default: true })
    enabled!: boolean;

    getText() {
        return this.text!.length > 15 ? this.text?.substring(0, 12).concat('...') : this.text;
    }
}
</script>
