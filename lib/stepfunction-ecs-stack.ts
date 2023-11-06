import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class StepfunctionEcsStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    
        // Write results to parquet with an ECS Task
        const taskDefinition = new ecs.FargateTaskDefinition(
            this,
            `test-container-task`
        );
        const containerImage = ecs.ContainerImage.fromAsset('src/test-container');
        taskDefinition.addContainer(
            `test-container`,
            {
                image: containerImage,
                containerName: `test-container`,
                environment: {
                    REGION_ID: this.region
                },
            }
        );

        const ecsVpc = new ec2.Vpc(this, 'Vpc', {
            maxAzs: 3,
            natGateways: 1,
        })
        const ecsCluster = new ecs.Cluster(this, 'Cluster', {
            vpc: ecsVpc,
        });


        // Write the results to parquet with an ECS Task
        const ecsTask = new tasks.EcsRunTask(
            this,
            `stepfunction-ecs-task`,
            {
                integrationPattern: sfn.IntegrationPattern.RUN_JOB,
                cluster: ecsCluster,
                taskDefinition: taskDefinition,
                launchTarget: new tasks.EcsFargateLaunchTarget(
                    {
                        platformVersion: ecs.FargatePlatformVersion.VERSION1_4,
                    }
                ),
                containerOverrides: [
                    {
                        containerDefinition: taskDefinition.defaultContainer!,
                        environment: [
                            {
                                name: "QUERY_EXECUTION_ID",
                                value: "dummy-query-execution-id",
                            }
                        ]
                    }
                ],
                propagatedTagSource: ecs.PropagatedTagSource.TASK_DEFINITION,
            }
        );
        new sfn.StateMachine(
            this,
            `state-machine`,
            {
                definitionBody: sfn.DefinitionBody.fromChainable(ecsTask),
                
            }
        );
    }
}
