<template>
    <g class="button enabled" @click="$emit('click')">
        <circle cx="15" cy="15" r="15" fill="#e9edf2" stroke="#1f2a36" stroke-width="2px" />
        <image v-if="isOn" x="5" y="5" width="20" height="20" href="../../icons/sound-on.svg" />
        <image v-else x="5" y="5" width="20" height="20" href="../../icons/sound-off.svg" />
        <title v-if="isOn">Sound off</title>
        <title v-else>Sound on</title>
    </g>
</template>
<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator';

@Component
export default class SoundButton extends Vue {
    @Prop()
    isOn?: boolean;
}
</script>
